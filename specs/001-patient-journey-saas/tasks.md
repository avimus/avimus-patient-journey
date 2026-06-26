# Tasks: Plataforma SaaS de Gestão de Jornada Clínica do Paciente

**Input**: Design documents from `/specs/001-patient-journey-saas/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅

**Note**: Protocol-engine unit tests are MANDATORY per the constitution (Principle II).
All other tests are out of scope for MVP.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete sibling tasks)
- **[Story]**: Maps to user story from spec.md (US1–US4)

---

## Phase 1: Setup (Monorepo Scaffold)

**Purpose**: Create the complete Turborepo monorepo structure with all package scaffolds before
any implementation begins. Every task here is a one-time initialization.

- [x] T001 Create monorepo root: package.json (pnpm workspaces, root scripts), pnpm-workspace.yaml, turbo.json (build/test/lint/dev pipelines), .gitignore, .env.example with all required variable names
- [x] T002 [P] Scaffold packages/types: package.json (name: @avimus/types), tsconfig.json (strict: true, composite), src/index.ts placeholder
- [x] T003 [P] Scaffold packages/db: package.json (name: @avimus/db, prisma scripts), tsconfig.json (strict: true), run prisma init to create packages/db/prisma/schema.prisma
- [x] T004 [P] Scaffold packages/protocol-engine: package.json (name: @avimus/protocol-engine, no external deps except vitest dev), tsconfig.json (strict: true), vitest.config.ts
- [x] T005 [P] Scaffold apps/api: package.json (name: api, deps: hono @hono/node-server @supabase/supabase-js @avimus/types @avimus/db @avimus/protocol-engine), tsconfig.json (strict: true), vercel.json (rewrite /api/:path* → api/index.ts), create directory structure src/middleware/ src/routes/ src/services/ api/
- [x] T006 [P] Scaffold apps/web: run `pnpm dlx create-next-app@14` with App Router + TypeScript + Tailwind, then install @supabase/ssr @supabase/supabase-js @avimus/types, init shadcn/ui (components.json), create directory structure src/app/(auth)/ src/app/(protected)/ src/components/ src/lib/
- [x] T007 Run `pnpm install` from repo root to verify all workspace dependency links resolve (especially @avimus/* cross-references)

**Checkpoint**: Monorepo structure exists. `pnpm install` completes without errors.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before any user story begins.
Types → DB schema → Engine → API scaffold → Seed. All engine functions require tests.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Shared Type Contracts (packages/types)

- [x] T008 Define packages/types/src/enums.ts: export StepStatus z.enum(['bloqueado','pendente','em_andamento','concluido','ignorado']), JourneyStatus z.enum(['ativo','concluido','suspenso','cancelado']), UserRole z.enum(['admin','medico','recepcionista','enfermeiro']), StepType z.enum(['consulta','exame','diagnostico','procedimento','retorno'])
- [x] T009 [P] Define packages/types/src/auth.ts: JWTPayloadSchema (sub, email, tenant_id, role, iat, exp) and packages/types/src/errors.ts: ApiErrorSchema (error: string, code: string, plus optional domain-specific fields)
- [x] T010 [P] Define packages/types/src/patient.ts: PatientSchema (all fields from data-model), CreatePatientSchema (validated input with CPF regex), PatientListItemSchema (with nullable activeJourney), PatientListResponseSchema (data[], total, page, limit), PatientDetailSchema (with journeys[])
- [x] T011 [P] Define packages/types/src/protocol.ts: ProtocolStepSchema, CreateProtocolSchema (with steps array), ProtocolDetailSchema (with steps[]), ProtocolListItemSchema (with stepCount, activeJourneyCount), ProtocolListResponseSchema. Define packages/types/src/snapshot.ts: ProtocolSnapshotSchema (id, name, steps: ProtocolStepDefSchema[])
- [x] T012 [P] Define packages/types/src/journey.ts: JourneyStepSchema (with denormalized snapshot fields: stepName, stepType, stepOrderIndex, isOverdue), JourneyDetailSchema (with protocolSnapshot, steps[], progress, nextStepId), CreateJourneySchema, UpdateJourneyStatusSchema, JourneyListResponseSchema. Define packages/types/src/step.ts: CompleteStepSchema (result?, notes?), CompleteStepResponseSchema (completedStep, unlockedStepIds, ignoredStepIds, nextStepId, progress, journeyStatus)
- [x] T013 [P] Define packages/types/src/dashboard.ts: DashboardStatsSchema (totalPatients, activeJourneys, overdueJourneys, suspendedJourneys, completedJourneys, overdueList with top-10 entries)
- [x] T014 Re-export all schemas and their inferred TypeScript types from packages/types/src/index.ts

### Database Schema & Migrations (packages/db)

- [x] T015 Write packages/db/prisma/schema.prisma with all 7 models: Tenant, User, Patient, Protocol, ProtocolStep, PatientJourney, JourneyStep, DataAccessLog — use exact field names, types, relations, and index/unique constraints from data-model.md
- [x] T016 Create packages/db/prisma/migrations/001_initial/migration.sql: CREATE TABLE for all 7 tables (snake_case names), followed by ENABLE ROW LEVEL SECURITY on each, followed by CREATE POLICY "tenant_isolation" USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid) for each table. DataAccessLog gets separate read-only SELECT + INSERT policies with no UPDATE/DELETE
- [x] T017 Implement packages/db/src/client.ts: export createPrismaClient(tenantId: string) that returns a PrismaClient extended with a query middleware adding where: { tenantId } to all findMany, findFirst, findUnique, update, updateMany, delete, deleteMany operations across all models. Export a module-level singleton factory.

### Protocol Engine (packages/protocol-engine)

- [x] T018 Define packages/protocol-engine/src/types.ts: ProtocolStepDef (id, name, type, orderIndex, prerequisiteStepIds, branchConditions, dueDays?), ProtocolSnapshot (id, name, steps), JourneyStepState (protocolStepId, status, result?), ProtocolResolution (unlockedStepIds, ignoredStepIds, nextStepId)
- [x] T019 [P] Implement packages/protocol-engine/src/resolve-next-steps.ts: export resolveNextSteps(protocol: ProtocolSnapshot, steps: JourneyStepState[]): ProtocolResolution. A step unlocks when all its prerequisiteStepIds have status 'concluido' AND the step is not 'ignorado'. nextStepId is the protocolStepId of the first step with status 'pendente' ordered by orderIndex. ignoredStepIds reflects steps bypassed by prior branch conditions.
- [x] T020 [P] Implement packages/protocol-engine/src/calculate-progress.ts: export calculateProgress(steps: JourneyStepState[]): number. Formula: (concluido_count / relevant_count) * 100 where relevant_count excludes 'ignorado' steps. Returns 0 if no relevant steps. Round to nearest integer.
- [x] T021 [P] Implement packages/protocol-engine/src/get-unlocked-steps.ts: export getUnlockedSteps(protocol: ProtocolSnapshot, steps: JourneyStepState[]): ProtocolStepDef[]. Returns the ProtocolStepDef objects for steps whose prerequisites are all 'concluido' and whose own status is 'bloqueado' (i.e., ready to transition to 'pendente').
- [x] T022 [P] Implement packages/protocol-engine/src/apply-branch-condition.ts: export applyBranchCondition(step: ProtocolStepDef, result: string, protocol: ProtocolSnapshot): { activated: ProtocolStepDef[], ignored: ProtocolStepDef[] }. Reads step.branchConditions[result] → activated step IDs. All other steps reachable exclusively via other branch keys become ignored. Returns empty arrays if branchConditions is empty or result matches no key (signal for manual review).
- [x] T023 [P] Write packages/protocol-engine/tests/resolve-next-steps.test.ts: test linear protocol (step 2 unlocks after step 1 complete), test branched protocol (surgical result marks conservative steps as ignored, unlocks surgical steps), test all-complete returns nextStepId null, test partial prerequisite (step not yet unlocked)
- [x] T024 [P] Write packages/protocol-engine/tests/calculate-progress.test.ts: test 0 of 5 = 0%, test 1 of 5 = 20%, test with 2 ignored steps (1 of 3 relevant = 33%), test all complete = 100%, test all ignored = 100% (or 0% — document the chosen behavior in a comment)
- [x] T025 [P] Write packages/protocol-engine/tests/get-unlocked-steps.test.ts: test step with no prerequisites is immediately unlocked, test step with one satisfied prerequisite unlocks, test step with two prerequisites only unlocks when both complete, test ignored step never returned
- [x] T026 [P] Write packages/protocol-engine/tests/apply-branch-condition.test.ts: test known result activates correct branch and marks others as ignored, test unknown result returns empty arrays, test step with empty branchConditions returns empty arrays
- [x] T027 Export all public functions from packages/protocol-engine/src/index.ts: resolveNextSteps, calculateProgress, getUnlockedSteps, applyBranchCondition, and all types from types.ts

### API Scaffold (apps/api)

- [x] T028 Implement apps/api/src/middleware/auth.ts: Hono middleware that reads Authorization header, verifies the JWT using @supabase/supabase-js createClient with SUPABASE_URL + SUPABASE_ANON_KEY, rejects with HTTP 401 and ApiError if missing or invalid. Sets verified JWT payload on ctx.var.jwtPayload.
- [x] T029 Implement apps/api/src/middleware/tenant.ts: Hono middleware (runs after auth) that extracts tenant_id and role from ctx.var.jwtPayload, validates both exist, rejects with HTTP 401 if missing. Sets ctx.var.tenantId and ctx.var.role. Creates a tenant-scoped Prisma client via createPrismaClient(tenantId) and sets ctx.var.db.
- [x] T030 Assemble apps/api/src/index.ts: create Hono app, apply auth + tenant middleware globally, mount route groups at /api/v1/ (patients, journeys, protocols, steps, dashboard as empty route stubs returning 501). Export the app.
- [x] T031 Create apps/api/api/index.ts: import { handle } from 'hono/vercel', import app from src/index, export config = { runtime: 'nodejs18.x' }, export default handle(app)

### Seed Data (packages/db)

- [x] T032 Write packages/db/prisma/seed.ts: seed Clínica São Lucas (slug: clinica-sao-lucas) + Hospital Vitória (slug: hospital-vitoria), 3 users per tenant (admin/medico/recepcionista), 2 protocols per tenant (Cólica Renal with 9 steps and branching at step 5, Hipertensão Arterial with 6 linear steps), 8 patients per tenant with Brazilian names, PatientJourney + JourneyStep records distributed to show all 5 step statuses (bloqueado, pendente, em_andamento, concluido, ignorado) and all 4 journey statuses (ativo, concluido, suspenso, cancelado). Run with `pnpm --filter @avimus/db seed`.

**Checkpoint**: `pnpm --filter @avimus/protocol-engine test` passes. `pnpm build` compiles packages/types and packages/protocol-engine. API scaffold starts without errors.

---

## Phase 3: User Story 4 — Authentication & Tenant Isolation (Priority: P1) 🔐

**Goal**: Users can log in with email/password. Sessions are tenant-scoped. Protected routes redirect unauthenticated users to /login. Cross-tenant data access returns 404.

**Independent Test**: Login with Clínica São Lucas credentials → see São Lucas data. Login with Hospital Vitória credentials in another tab → see Vitória data. Attempt cross-tenant API call → 404 (Scenario 1 in quickstart.md).

- [x] T033 [US4] Implement apps/web/src/lib/auth.ts: createBrowserSupabaseClient() using @supabase/ssr createBrowserClient, createServerSupabaseClient(cookies) using createServerClient, getSession() helper that returns { session, user, tenantId, role } or null. Export all for use in Server Components and middleware.
- [x] T034 [US4] Implement apps/web/src/middleware.ts: use createServerSupabaseClient to validate session on every request to /(protected)/* routes. Redirect to /login if no session or no tenant_id in JWT. Refresh session cookie to prevent expiry. Set matcher config to protect only (protected) routes.
- [x] T035 [US4] Create apps/web/src/app/(auth)/login/page.tsx: email + password form, calls supabase.auth.signInWithPassword, on success redirects to /dashboard, displays error message on failure. No external form library — use React state.
- [x] T036 [P] [US4] Create apps/web/src/components/layout/sidebar.tsx: navigation links to /dashboard, /patients, /protocols (protocols link visible only when role === 'admin'). Highlights active route. Shows tenant name and user name/role in footer. Accepts session props.
- [x] T037 [P] [US4] Create apps/web/src/components/layout/header.tsx: page title slot, sign-out button that calls supabase.auth.signOut and redirects to /login.
- [x] T038 [US4] Create apps/web/src/app/(protected)/layout.tsx: Server Component that calls getSession() — redirect to /login if null. Renders Sidebar + Header + {children} in a flex layout. Passes session data to Sidebar via props.
- [x] T039 [US4] Implement apps/web/src/lib/api-client.ts: export async functions for each API endpoint — patients: listPatients(params), getPatient(id); journeys: listJourneys(params), getJourney(id), createJourney(body), updateJourneyStatus(id, body); protocols: listProtocols(), getProtocol(id), createProtocol(body), updateProtocol(id, body), deleteProtocol(id); steps: completeStep(id, body); dashboard: getDashboardStats(). Each function: reads session, adds Authorization header, calls fetch, validates response with the matching Zod schema from @avimus/types, throws typed ApiError on non-2xx.
- [x] T040 [US4] Create apps/web/src/lib/utils.ts: cn() using clsx + tailwind-merge, formatDate(iso: string): string (pt-BR locale), formatCPF(cpf: string): string (formats raw digits to 000.000.000-00 mask)

**Checkpoint**: Login page works. Authenticated user sees the sidebar layout. Unauthenticated access to /dashboard redirects to /login. All API client functions type-check.

---

## Phase 4: User Story 1 — Professional Views and Advances Journey (Priority: P1) 🎯 MVP

**Goal**: A professional can view the complete protocol timeline for a patient (all steps with status, branching, progress) and register the completion of a step, automatically unlocking the next steps.

**Independent Test**: Scenarios 4, 5, 6, 7, 8 from quickstart.md — view journey, complete step, branch condition, concurrency conflict, role check.

### API Implementation

- [x] T041 [US1] Implement apps/api/src/services/journey-service.ts — getJourneyDetail(journeyId, tenantId): fetches PatientJourney + all JourneyStep rows, reads protocolSnapshot, calls resolveNextSteps to get progress and nextStepId, joins executedBy user names, returns JourneyDetailSchema-shaped object with all steps denormalized from snapshot
- [x] T042 [US1] Implement apps/api/src/services/journey-service.ts — completeStep(stepId, tenantId, userId, userRole, body): (1) load step + journey in a transaction, (2) check journey.status === 'ativo' → 409 if not, (3) check step.status not in ['concluido','ignorado'] → 409 STEP_ALREADY_COMPLETED with current state, (4) check role vs step type using Role×StepType matrix → 403 if insufficient, (5) for 'diagnostico' type: validate result matches a branchConditions key, (6) mark step concluido with executedAt/executedById/result/notes, (7) call applyBranchCondition if step has branchConditions + result, (8) call getUnlockedSteps, update unlocked steps to 'pendente' and ignored to 'ignorado', (9) calculate progress via calculateProgress, (10) if progress === 100 set journey.status = 'concluido', (11) create DataAccessLog (COMPLETE_STEP), (12) return CompleteStepResponseSchema
- [x] T043 [US1] Implement apps/api/src/services/journey-service.ts — createJourney(patientId, protocolId, tenantId, userId): fetch Protocol + ProtocolSteps, build ProtocolSnapshot JSON, create PatientJourney, create JourneyStep for each step with status 'bloqueado', call getUnlockedSteps on the new empty journey, set initial steps to 'pendente', log DataAccessLog (CREATE_JOURNEY), return JourneyDetailSchema
- [x] T044 [US1] Implement GET /api/v1/journeys/:id and POST /api/v1/journeys in apps/api/src/routes/journeys.ts: GET uses zValidator on param (UUID), calls getJourneyDetail, returns 200 or 404. POST uses zValidator on body (CreateJourneySchema), calls createJourney, returns 201. Log DataAccessLog VIEW_JOURNEY on GET.
- [x] T045 [US1] Implement PATCH /api/v1/steps/:id/complete in apps/api/src/routes/steps.ts: zValidator on param (UUID) and body (CompleteStepSchema), call completeStep service, return CompleteStepResponseSchema on 200 or appropriate error response

### Frontend Implementation

- [x] T046 [P] [US1] Create apps/web/src/components/journey/progress-bar.tsx: accepts progress (0–100) and status (JourneyStatus), renders a labeled progress bar using shadcn/ui Progress component, shows "Concluída" when 100%, shows journey status badge
- [x] T047 [P] [US1] Create apps/web/src/components/journey/step-card.tsx: accepts JourneyStepSchema + current userRole + onClick handler. Renders step name, type badge, status badge with distinct colors (bloqueado=gray, pendente=yellow, em_andamento=blue, concluido=green, ignorado=muted+strikethrough). Shows "Registrar Conclusão" button: enabled when status is pendente/em_andamento AND role allows the step type; disabled with tooltip explaining why when role insufficient. Clicking anywhere on card fires onClick.
- [x] T048 [P] [US1] Create apps/web/src/components/journey/branch-indicator.tsx: accepts an array of branch labels (result keys from branchConditions). Renders a visual fork icon with labels for each branch path. Displayed between the branching step and its child steps in the timeline.
- [x] T049 [US1] Create apps/web/src/components/journey/step-drawer.tsx: shadcn/ui Sheet (slide-over). When step status is concluido/ignorado: shows read-only view of executedBy, executedAt, result, notes. When pendente/em_andamento and user has role permission: shows form with result field (text input for non-diagnostico; select dropdown populated from branchConditions keys for diagnostico type), notes textarea, submit button. On submit: calls completeStep API, shows loading state, on success calls onStepCompleted callback, on conflict (409) shows toast with conflict details.
- [x] T050 [US1] Create apps/web/src/components/journey/journey-timeline.tsx: accepts JourneyDetailSchema + userRole. Groups steps by orderIndex. Detects when a step has branchConditions (rendered step is a fork): renders StepCard for the branching step, then BranchIndicator, then the activated branch steps (concluido/ignorado/pendente) in separate columns side by side. Linear steps render in a single vertical stack. Highlights nextStepId step with a "Próximo Passo" label. Renders ProgressBar at the top. Opens StepDrawer on step click. Calls onJourneyUpdate with refreshed journey after step completion.
- [x] T051 [US1] Create apps/web/src/app/(protected)/journeys/[id]/page.tsx: Server Component that calls getJourney(id) from api-client, passes result to JourneyTimeline with session.role. Shows patient name + protocol name in page header. Handles 404 with notFound().

**Checkpoint**: Professional can open any seeded patient journey, see all step statuses, click a step, complete it, and see the next step unlock — all reflected within 2 seconds (SC-002).

---

## Phase 5: User Story 2 — Dashboard & Patient List (Priority: P2)

**Goal**: Professional lands on a Dashboard showing tenant metrics (patients, active/overdue journeys) and can navigate to a patient list with search/filter, then click through to a patient's journey.

**Independent Test**: Scenarios 2 and 3 from quickstart.md — dashboard counts match seed data, patient search filters the list, clicking a patient navigates to /journeys/:id.

### API Implementation

- [x] T052 [US2] Implement GET /api/v1/dashboard/stats in apps/api/src/routes/dashboard.ts: query PatientJourney grouped by status, compute overdueJourneys by joining JourneyStep where the current step's updatedAt is older than dueDays, build top-10 overdueList sorted by most overdue first. Return DashboardStatsSchema.
- [x] T053 [US2] Implement apps/api/src/services/patient-service.ts: listPatients(tenantId, { search, page, limit }): query Patient with optional fullName/cpf search, join most recent active PatientJourney + its current step. Returns PatientListResponseSchema. getPatient(tenantId, patientId): fetch Patient + all journeys with status and progress. Creates DataAccessLog (VIEW_PATIENT). Returns PatientDetailSchema or null.
- [x] T054 [US2] Implement GET /api/v1/patients and GET /api/v1/patients/:id in apps/api/src/routes/patients.ts: list endpoint uses zValidator on query params (search, page, limit with defaults), calls listPatients, returns 200. Detail endpoint uses zValidator on param, calls getPatient, logs DataAccessLog VIEW_PATIENT, returns 200 or 404.

### Frontend Implementation

- [x] T055 [P] [US2] Create apps/web/src/components/dashboard/metric-card.tsx: Card with label, large number, optional subtitle. Accepts variant prop for color: default (blue), warning (amber for overdue), success (green for completed).
- [x] T056 [P] [US2] Create apps/web/src/components/dashboard/overdue-list.tsx: renders a compact list of up to 10 overdue journeys with patient name, protocol name, current step, and how many days overdue. Each row links to /journeys/:id. Shows empty state if no overdue journeys.
- [x] T057 [US2] Create apps/web/src/app/(protected)/dashboard/page.tsx: Server Component calls getDashboardStats(), renders 4 MetricCards (total patients, active, overdue, suspended) in a grid and OverdueList below.
- [x] T058 [P] [US2] Create apps/web/src/components/patients/patient-filters.tsx: search input (debounced 300ms) and optional future filter slots. Controlled component — accepts value + onChange props. Used in the patients list page.
- [x] T059 [P] [US2] Create apps/web/src/components/patients/patient-table.tsx: shadcn/ui DataTable with columns: Nome, Protocolo, Etapa Atual, Status (badge), Atualização (relative date), Ação (link to journey). Accepts PatientListItemSchema[] and total/page/limit for pagination. Overdue rows have an amber background tint.
- [x] T060 [US2] Create apps/web/src/app/(protected)/patients/page.tsx: Client Component (for search state). Uses PatientFilters + PatientTable. On mount and on search change: calls listPatients from api-client, updates table data. Handles empty state.
- [x] T061 [US2] Create apps/web/src/app/(protected)/patients/[id]/page.tsx: Server Component calls getPatient(id), shows patient demographics, lgpdLegalBasis badge, and a JourneyList (summary cards with protocol name, status, progress bar, start date). Each journey card links to /journeys/:id. Handles 404 with notFound().

**Checkpoint**: Dashboard shows correct counts from seed data. Patient list shows all 8 seeded patients. Search filters work. Patient → journey navigation works in ≤3 clicks from login (SC-001).

---

## Phase 6: User Story 3 — Admin Configures Protocols (Priority: P3)

**Goal**: Admin can list, view, create, and edit protocols with branching steps. Deletion is blocked when active journeys exist.

**Independent Test**: Scenario 10 from quickstart.md — create protocol, view it, attempt to delete with active journey → 409 error.

### API Implementation

- [x] T062 [US3] Implement apps/api/src/services/protocol-service.ts: getProtocolDetail(tenantId, protocolId), listProtocols(tenantId), createProtocol(tenantId, body): create Protocol + ProtocolStep rows (resolve positional prerequisite references to UUIDs), updateProtocol(tenantId, protocolId, body): check no active/suspended journeys → 409 if found, then replace steps, deleteProtocol(tenantId, protocolId): same active-journey guard, set isActive=false. Also add createJourneyForPatient wrapper already implemented in Phase 4 but formally exported here.
- [x] T063 [US3] Implement all protocol routes in apps/api/src/routes/protocols.ts: GET /protocols (returns ProtocolListResponseSchema), GET /protocols/:id (ProtocolDetailSchema or 404), POST /protocols (role check: admin only, CreateProtocolSchema validation, call createProtocol), PUT /protocols/:id (admin only, same validation, call updateProtocol), DELETE /protocols/:id (admin only, call deleteProtocol)
- [x] T064 [US3] Implement PATCH /api/v1/journeys/:id/status in apps/api/src/routes/journeys.ts: admin-only role check, validate transition is legal (ativo→suspenso, suspenso→ativo, ativo→cancelado, suspenso→cancelado; reject concluido), update status, return JourneyStatusResponseSchema. Log DataAccessLog (SUSPEND_JOURNEY or CANCEL_JOURNEY).

### Frontend Implementation

- [x] T065 [P] [US3] Create apps/web/src/components/protocols/protocol-list.tsx: renders a DataTable of protocols with columns: Nome, Etapas, Jornadas Ativas, Status (active/inactive badge), Ações (view, edit). Links to /protocols/:id.
- [x] T066 [P] [US3] Create apps/web/src/components/protocols/protocol-step-editor.tsx: dynamic form for creating/editing protocol steps. Each step has: name, type (select), dueDays (optional number input), prerequisiteStepIds (multi-select from previously added steps), branchConditions (key-value editor — result string → comma-separated step references). Add/remove step buttons. Read-only when protocol has active journeys (shows warning banner).
- [x] T067 [US3] Create apps/web/src/app/(protected)/protocols/page.tsx: admin-only Server Component (redirect non-admins to /dashboard). Calls listProtocols(), renders ProtocolList with a "Novo Protocolo" button that navigates to /protocols/new.
- [x] T068 [US3] Create apps/web/src/app/(protected)/protocols/[id]/page.tsx: supports both existing protocol IDs and the literal "new" slug. For existing: calls getProtocol(id), renders read-only protocol header + ProtocolStepEditor pre-filled with current steps. Save calls updateProtocol. Delete button with confirmation modal — shows active-journey count from API error if blocked. For "new": empty ProtocolStepEditor form, save calls createProtocol.

**Checkpoint**: Admin can create a complete protocol with branching, assign it to a patient via POST /journeys, and see the journey appear correctly. Deletion of an in-use protocol returns a 409 with clear messaging.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Finalize error handling, DataAccessLog completeness, TypeScript build verification, and seed validation.

- [x] T069 Add global error handler to apps/api/src/index.ts using Hono's onError hook: catches unhandled errors, returns ApiErrorSchema-shaped response with code "INTERNAL_ERROR" and HTTP 500. Adds a notFound handler returning 404 with code "ROUTE_NOT_FOUND".
- [x] T070 [P] Verify DataAccessLog is created on every sensitive operation: VIEW_PATIENT in getPatient, VIEW_JOURNEY in GET /journeys/:id, COMPLETE_STEP in completeStep, CREATE_PATIENT in POST /patients, CREATE_JOURNEY in createJourney, SUSPEND_JOURNEY and CANCEL_JOURNEY in PATCH /journeys/:id/status. Add any missing log calls to their respective services.
- [x] T071 [P] Run `pnpm --filter @avimus/protocol-engine test` — all 4 test files must pass with no TypeScript errors. Fix any failing tests or type errors before merge.
- [x] T072 Run `pnpm build` from repo root — verify TypeScript strict compilation passes for all 5 packages with zero errors (no `any`, no implicit types, no missing imports).
- [x] T073 Run `pnpm --filter @avimus/db seed` against a test Supabase instance — verify it completes in under 60 seconds (SC-003 and Constitution Principle V), all 5 step statuses are present in journey_steps, all 4 journey statuses are present in patient_journeys.

**Checkpoint**: All tests pass. Build succeeds. Seed completes cleanly. All quickstart.md scenarios executable with seed data only.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Requires Phase 1 complete — BLOCKS all user story phases
- **Phase 3 (US4 Auth)**: Requires Phase 2
- **Phase 4 (US1 Journey)**: Requires Phase 2 + Phase 3
- **Phase 5 (US2 Dashboard)**: Requires Phase 2 + Phase 3; can overlap with Phase 4
- **Phase 6 (US3 Protocols)**: Requires Phase 2 + Phase 3 + Phase 4 (creates journeys)
- **Phase 7 (Polish)**: Requires all user story phases complete

### User Story Dependencies

- **US4 (P1) — Auth**: Foundational only. No story-level dependencies.
- **US1 (P1) — Journey**: Depends on US4 (needs login + API client).
- **US2 (P2) — Dashboard**: Depends on US4; can be worked in parallel with US1 if staffed.
- **US3 (P3) — Protocols**: Depends on US4 + US1 (journey creation flow reused).

### Within Each Phase

- Tasks marked [P] within the same phase can run simultaneously
- All [P] tasks within Phase 2 types section (T009–T013) can run in parallel after T008
- All [P] engine function implementations (T019–T022) can run in parallel after T018
- All [P] engine tests (T023–T026) can run in parallel after T018 (test files are independent)
- T028 (auth middleware) and T029 (tenant middleware) must complete before T030 (app assembly)

---

## Parallel Execution Examples

### Phase 2 — Types in Parallel (after T008)
```
T009: auth.ts + errors.ts    T010: patient.ts    T011: protocol.ts + snapshot.ts
T012: journey.ts + step.ts   T013: dashboard.ts
→ T014: index.ts (after all above)
```

### Phase 2 — Protocol Engine in Parallel (after T018)
```
T019: resolve-next-steps.ts     T020: calculate-progress.ts
T021: get-unlocked-steps.ts     T022: apply-branch-condition.ts
    ↓ (tests can overlap with implementations)
T023: resolve-next-steps.test   T024: calculate-progress.test
T025: get-unlocked-steps.test   T026: apply-branch-condition.test
→ T027: index.ts (after all above)
```

### Phase 4 — US1 Frontend in Parallel (after T042–T045 API is done)
```
T046: progress-bar.tsx    T047: step-card.tsx    T048: branch-indicator.tsx
→ T049: step-drawer.tsx (needs step-card done)
→ T050: journey-timeline.tsx (needs drawer + cards)
→ T051: /journeys/[id]/page.tsx
```

---

## Implementation Strategy

### MVP First (US4 + US1 — Two Phases After Foundational)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (engine + types + db + API scaffold + seed)
3. Complete Phase 3: US4 (login + middleware + API client)
4. Complete Phase 4: US1 (journey view + step completion)
5. **STOP and VALIDATE**: Full journey flow works with seed data (Scenarios 4–8 in quickstart.md)
6. Demo-ready: any clinician can log in, see a patient journey, and complete a step

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US4 → Login and tenant isolation work
3. Add US1 → Journey view and step completion (MVPs the core value)
4. Add US2 → Dashboard and patient list (operational daily use)
5. Add US3 → Protocol configuration (admin self-service)
6. Polish → Production-ready

### Parallel Team Strategy

After Phase 2 completes:
- Developer A: US4 (Auth/Middleware)
- Developer B: Protocol Engine tests (T023–T026) — if not completed in Phase 2
- Once US4 done:
  - Developer A: US1 Journey API (T041–T045)
  - Developer B: US1 Journey frontend (T046–T051)
  - Developer C: US2 Dashboard + Patients (T052–T061)

---

## Notes

- [P] tasks touch different files and have no unresolved in-phase dependencies
- [Story] label enables traceability from task to spec.md user story
- Constitution Principle II enforces engine tests (T023–T026) — not optional
- Constitution Principle III requires `pnpm build` to pass with strict: true (T072)
- Constitution Principle V requires seed to complete under 60 seconds (T073)
- Mark each task [X] in this file as soon as it is complete
- Stop at each Checkpoint to validate the phase before proceeding
