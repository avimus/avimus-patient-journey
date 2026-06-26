# Quickstart: Integration Scenarios

**Phase**: 1 — Design | **Date**: 2026-06-26

This document describes the end-to-end flows that the implementation must support. Each
scenario can be exercised against the seed data without manual data entry (SC-003).

---

## Prerequisites (Seed Data)

After running `pnpm --filter @avimus/db seed`:

- **Tenant A** — Clínica São Lucas (slug: `clinica-sao-lucas`)
  - Users: `ricardo@saolucas.com` / `Dra. Fernanda Costa` / `Carla Souza` (all pwd: `Demo@123456`)
  - Protocols: "Protocolo de Cólica Renal" (9 steps, branching) + "Protocolo de Hipertensão Arterial" (6 steps, linear)
  - 8 patients in varied journey stages

- **Tenant B** — Hospital Vitória (slug: `hospital-vitoria`)
  - Users: `paulo@hospitalvitoria.com` / etc. (same pwd)
  - Same 2 protocols (independent copies)
  - 8 different patients

---

## Scenario 1 — Login and Tenant Workspace

**Goal**: Verify authentication and multi-tenant isolation.

```
1. Open app root → redirected to /login
2. Enter email: ricardo@saolucas.com, password: Demo@123456
3. POST /api/v1/auth/session (Supabase handles this; Next.js middleware validates)
4. Redirect to /dashboard
5. Dashboard shows Clínica São Lucas data only
6. Open new tab, login as paulo@hospitalvitoria.com
7. GET /api/v1/dashboard/stats → returns Hospital Vitória counts only
8. Attempt to access /api/v1/patients/{patient-from-sao-lucas} with Hospital Vitória session
   → expect HTTP 404 (tenant isolation)
```

**Key assertion**: Step 8 must return 404, not 403 — never reveal that the resource exists.

---

## Scenario 2 — Dashboard Metrics

**Goal**: Dashboard cards reflect accurate counts from seed data.

```
1. Login as ricardo@saolucas.com
2. GET /api/v1/dashboard/stats
   Response: {
     totalPatients: 8,
     activeJourneys: 6,
     overdueJourneys: 2,   // journeys where current step exceeded dueDays
     upcomingReturns: []   // out of scope for MVP stats
   }
3. UI shows 3 metric cards + overdue highlight list
```

---

## Scenario 3 — Patient List and Navigation

**Goal**: Locate a patient in 2 clicks from Dashboard (SC-001).

```
1. From Dashboard, click "Ver pacientes" → navigate to /patients
2. GET /api/v1/patients?page=1&limit=20
   Response: list of {id, fullName, cpf, activeJourney: {protocolName, currentStepName, status, updatedAt}}
3. Table renders with columns: Nome, Protocolo, Etapa Atual, Status, Última Atualização
4. Type "Maria" in search → GET /api/v1/patients?search=Maria
   → filtered list (client-side or server-side both acceptable)
5. Click patient row → navigate to /patients/{id}
6. GET /api/v1/patients/{id} → patient detail + latest journey
```

---

## Scenario 4 — View Patient Journey (Core Flow)

**Goal**: Verify journey timeline displays all step statuses correctly (US1 acceptance scenario 1).

Seed patient: "Carlos Eduardo Santos" — Cólica Renal protocol, currently at step 2 (Exame Laboratorial).

```
1. Navigate to /patients/{carlos-id} → /journeys/{journey-id}
2. GET /api/v1/journeys/{id}
   Response includes:
   - protocolSnapshot with 9 steps
   - steps array with current status per step
   - progress: 11 (1 of 9 non-ignored steps complete)
3. UI renders:
   - Step 1 "Triagem Inicial": badge CONCLUÍDO (green)
   - Step 2 "Exame Laboratorial": badge EM ANDAMENTO (blue) — highlighted as next step
   - Steps 3–9: badge BLOQUEADO (gray)
4. Click step 1 → step-drawer opens with executedAt, executedBy, result, notes
5. Click step 2 → step-drawer opens with "Registrar Conclusão" button enabled
   (user is médico, step type is exame — role check passes)
```

---

## Scenario 5 — Complete a Step and Unlock Next (Core Flow)

**Goal**: Register step completion; verify automatic unlocking (US1 acceptance scenario 1 + SC-002).

```
1. In step-drawer for "Exame Laboratorial" (step 2):
   - Fill result: "Cálculo de 8mm identificado"
   - Fill notes: "USG confirmado"
   - Click "Registrar Conclusão"
2. PATCH /api/v1/steps/{step-2-id}/complete
   Body: { result: "Cálculo de 8mm identificado", notes: "USG confirmado" }
3. Server:
   a. Validates step status = 'pendente' or 'em_andamento' (not already concluido)
   b. Calls resolveNextSteps(snapshot, currentSteps) — step 3 prerequisites met
   c. Updates JourneyStep step-2: status → 'concluido', executedAt, executedById
   d. Updates JourneyStep step-3: status → 'pendente'
   e. Logs DataAccessLog (COMPLETE_STEP)
   f. Returns updated journey steps + new progress
4. UI updates within 2 seconds (SC-002):
   - Step 2: CONCLUÍDO
   - Step 3 "Diagnóstico Médico": PENDENTE (highlighted as next step)
   - Progress bar: 22%
```

---

## Scenario 6 — Branching Condition (Core Flow)

**Goal**: Completing a diagnostic step with a result activates the correct branch (US1 acceptance scenario 2).

```
1. Advance patient to step 5 "Diagnóstico Médico" (diagnostic type, has branchConditions)
2. Open step drawer → result field shows dropdown options: "cirurgico", "conservador"
3. Select "cirurgico", click Registrar Conclusão
4. PATCH /api/v1/steps/{step-5-id}/complete
   Body: { result: "cirurgico" }
5. Server calls applyBranchCondition(step5Def, "cirurgico", snapshot):
   → returns [step-6b, step-7b, step-8b, step-9b]
6. Server:
   a. Marks step-6a, step-7a as 'ignorado'
   b. Marks step-6b as 'pendente' (6b's only prerequisite is step-5, now concluido)
   c. Steps 7b, 8b, 9b remain 'bloqueado' (sequential prerequisites)
7. UI renders:
   - Steps 6A, 7A: IGNORADO (muted, strikethrough)
   - Step 6B: PENDENTE
   - Steps 7B, 8B, 9B: BLOQUEADO
   - Branch indicator visible between step 5 and branches
```

---

## Scenario 7 — Concurrency Conflict

**Goal**: Second professional cannot double-complete a step (FR-006).

```
1. Two browser sessions for the same patient journey, step 3 is PENDENTE
2. Session A clicks Registrar Conclusão
3. Session B clicks Registrar Conclusão simultaneously
4. Session A's PATCH /api/v1/steps/{id}/complete succeeds:
   → step status → 'concluido'
5. Session B's PATCH /api/v1/steps/{id}/complete:
   → Server finds step.status = 'concluido' → returns HTTP 409
   → Body: { error: "Etapa já concluída", completedBy: "Dr. Ricardo Alves", completedAt: "..." }
6. Session B's UI shows error toast with the conflict message
7. Session B's journey view refreshes to show current state
```

---

## Scenario 8 — Role-Based Button State

**Goal**: Recepcionista can complete consulta steps but not diagnostico steps.

```
1. Login as carla@saolucas.com (role: recepcionista)
2. Open journey for any patient
3. Step "Triagem Inicial" (type: consulta, status: pendente):
   → "Registrar Conclusão" button ENABLED
4. Step "Diagnóstico Médico" (type: diagnostico, status: pendente):
   → "Registrar Conclusão" button DISABLED
   → Tooltip: "Apenas médicos podem registrar esta etapa"
5. Attempt POST via API directly with recepcionista JWT:
   PATCH /api/v1/steps/{diagnostico-step-id}/complete
   → HTTP 403: { error: "Role insuficiente para este tipo de etapa" }
```

---

## Scenario 9 — Admin Suspends Journey

**Goal**: Admin can suspend a journey; professional cannot advance steps while suspended.

```
1. Login as admin (ricardo@saolucas.com)
2. PATCH /api/v1/journeys/{id}/status
   Body: { status: "suspenso" }
   → 200 OK, journey.status = "suspenso"
3. Login as medico (fernanda@saolucas.com)
4. PATCH /api/v1/steps/{id}/complete
   → HTTP 409: { error: "Jornada suspensa. Contate o administrador." }
5. Admin reactivates: PATCH /api/v1/journeys/{id}/status { status: "ativo" }
   → Steps can be advanced again
```

---

## Scenario 10 — Protocol Management (Admin)

**Goal**: Admin creates a protocol with branching; it's available for new journeys.

```
1. Login as admin
2. GET /api/v1/protocols → list of tenant's protocols
3. POST /api/v1/protocols
   Body: { name: "Protocolo de Fratura de Fêmur", description: "...", steps: [] }
4. PUT /api/v1/protocols/{id}/steps (or included in protocol body — see contract)
   Add 4 steps with step-3 having branchConditions
5. GET /api/v1/protocols/{id} → verify structure
6. POST /api/v1/journeys with protocolId = new protocol → journey created with snapshot
7. Attempt DELETE /api/v1/protocols/{id}:
   → 409: "Protocolo possui jornadas ativas" (since step 6 created one)
```

---

## Local Development Quick Reference

```bash
# Start all services
pnpm dev

# Run protocol engine tests
pnpm --filter @avimus/protocol-engine test

# Reset and reseed database
pnpm --filter @avimus/db seed

# Build all packages (in dependency order)
pnpm build
```

**Environment variables** (copy `.env.example` to `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...    # API only, never expose to browser
DATABASE_URL=postgresql://...?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://...         # For migrations (no pooler)
```
