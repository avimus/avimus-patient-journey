# Implementation Plan: Plataforma SaaS de Gestão de Jornada Clínica do Paciente

**Branch**: `001-patient-journey-saas` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-patient-journey-saas/spec.md`

## Summary

Build a multi-tenant clinical patient journey management SaaS. A Turborepo monorepo with five
packages: `apps/web` (Next.js 14 App Router), `apps/api` (Hono.js on Vercel Functions),
`packages/protocol-engine` (pure TypeScript clinical logic), `packages/db` (Prisma + Supabase
PostgreSQL), and `packages/types` (shared Zod contracts). Tenant isolation is enforced end-to-end:
Supabase RLS policies on every table from migration 001, custom Supabase JWT template injecting
`tenant_id` and `role`, and middleware in both Next.js and Hono that reject any request missing
a valid tenant claim. The protocol engine computes which steps are unlocked, calculates journey
progress, and applies branching conditions — pure TypeScript, zero framework deps, covered by
Vitest.

## Technical Context

**Language/Version**: TypeScript 5.x with `strict: true` across all packages

**Primary Dependencies**:
- Turborepo 2.x + pnpm 9.x workspaces (monorepo orchestration)
- Next.js 14.2 + Tailwind CSS 3.x + shadcn/ui (apps/web)
- Hono.js 4.x with `@hono/node-server` adapter for Vercel Functions (apps/api)
- Prisma 5.x ORM connecting to Supabase PostgreSQL (packages/db)
- Zod 3.x for all request/response schemas (packages/types)
- Supabase Auth + `@supabase/ssr` for session management (apps/web)
- `@supabase/supabase-js` for JWT verification in Hono (apps/api)
- Vitest 1.x for unit tests (packages/protocol-engine)

**Storage**: Supabase PostgreSQL with Row Level Security on all tables. Prisma as ORM; raw SQL
in migrations for RLS policy definitions. Prisma connects with the service role key and enforces
tenant isolation at the application layer via an automatic query extension (safety net: RLS
policies still active for defence-in-depth).

**Testing**: Vitest for protocol-engine unit tests only. No E2E or integration tests in MVP scope.

**Target Platform**: Vercel — apps/web as Next.js deployment, apps/api as Vercel Functions
(Node.js runtime via `@hono/node-server`).

**Project Type**: Multi-tenant SaaS web application (Turborepo monorepo)

**Performance Goals**: Step unlock reflected in UI within 2 seconds of completion (SC-002).
No additional p95 latency targets for MVP.

**Constraints**:
- RLS enabled on every table from migration 001 onward; no table created without a policy
- JWT must carry `tenant_id` (UUID) and `role` claims via Supabase custom JWT template
- No cross-tenant data in any query, API response, log entry, or seed fixture
- Zero external framework dependencies in `packages/protocol-engine`
- `any` type forbidden everywhere; `strict: true` in every tsconfig.json
- Prisma query extension adds `where: { tenantId }` filter to every find/update/delete operation

**Scale/Scope**: MVP — 2 tenant demo workspaces; 2 protocols per tenant; 8 patients per tenant;
varied journey stages for all status types; 6 screens; 5 API route groups

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| # | Principle | Pre-Design | Post-Design | Notes |
|---|-----------|-----------|-------------|-------|
| I | Multi-Tenant Isolation | ✅ PASS | ✅ PASS | RLS on all 7 tables from migration 001; Prisma extension enforces tenantId on every query; Next.js middleware and Hono middleware both validate JWT tenant claim before any handler runs |
| II | Protocol Engine Decoupled | ✅ PASS | ✅ PASS | All clinical advancement logic lives in packages/protocol-engine with zero deps; apps/api services call engine functions then persist results; apps/web never calls the engine directly |
| III | TypeScript Strict | ✅ PASS | ✅ PASS | strict: true in all 5 tsconfigs; no `any` in contracts, engine, or schemas; `unknown` with type guards for JSON fields |
| IV | Validated API Contracts | ✅ PASS | ✅ PASS | Every Hono route uses zValidator() with Zod schemas imported from packages/types; response shapes are typed and validated before sending |
| V | Rich Seed Data | ✅ PASS | ✅ PASS | Seed covers 2 tenants × 2 protocols × 8 patients; journey steps distributed across all 5 status values; branch scenarios present in Diagnóstico step |
| VI | Clinical UI Clarity | ✅ PASS | ✅ PASS | shadcn/ui Table and Badge for status; distinct color tokens per status; disabled Complete button with tooltip for role mismatch; overdue journeys highlighted in red |
| VII | API-First | ✅ PASS | ✅ PASS | apps/web exclusively uses typed fetch wrappers in lib/api-client.ts; no Next.js Server Actions; no Prisma imports in apps/web |

## Project Structure

### Documentation (this feature)

```text
specs/001-patient-journey-saas/
├── plan.md              # This file
├── research.md          # Phase 0: Resolved technical decisions and patterns
├── data-model.md        # Phase 1: Full entity model with fields, relations, RLS
├── quickstart.md        # Phase 1: End-to-end demo integration scenarios
├── contracts/           # Phase 1: Per-route-group API contracts
│   ├── patients.md
│   ├── journeys.md
│   ├── protocols.md
│   ├── steps.md
│   └── dashboard.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
apps/
  web/
    src/
      app/
        (auth)/
          login/
            page.tsx                   # Email/password login form
        (protected)/
          layout.tsx                   # Sidebar + TenantProvider + session guard
          dashboard/
            page.tsx                   # Metric cards + overdue list
          patients/
            page.tsx                   # Patient table with search/filter
            [id]/
              page.tsx                 # Patient detail + active journey
          journeys/
            [id]/
              page.tsx                 # Full protocol timeline view
          protocols/
            page.tsx                   # Protocol list (admin only)
            [id]/
              page.tsx                 # Protocol detail + step editor
      components/
        ui/                            # shadcn/ui primitives (generated)
        layout/
          sidebar.tsx                  # Tenant-aware nav with role visibility
          header.tsx
        journey/
          journey-timeline.tsx         # Full step list with status icons
          step-card.tsx                # Individual step with status badge
          step-drawer.tsx              # Slide-over: detail + complete form
          progress-bar.tsx             # 0-100% progress with label
          branch-indicator.tsx         # Visual branch divergence marker
        patients/
          patient-table.tsx            # DataTable with shadcn/ui columns
          patient-filters.tsx          # Search input + protocol filter
        dashboard/
          metric-card.tsx              # Card: label + count + trend
          overdue-list.tsx             # Overdue journeys quick list
        protocols/
          protocol-list.tsx
          protocol-step-editor.tsx     # Add/edit steps with branch conditions
      lib/
        api-client.ts                  # Typed fetch wrappers for every endpoint
        auth.ts                        # Supabase SSR client + getSession helper
        utils.ts                       # cn(), formatDate(), formatCPF()
      middleware.ts                    # Next.js: verify Supabase session + tenant
    public/
    next.config.js
    tailwind.config.ts
    components.json                    # shadcn/ui configuration
    tsconfig.json
    package.json

  api/
    src/
      index.ts                         # Hono app factory: mount middleware + routes
      middleware/
        auth.ts                        # Verify Supabase JWT, reject if invalid
        tenant.ts                      # Extract tenant_id + role, inject into ctx
      routes/
        patients.ts                    # GET /patients, POST /patients, GET /patients/:id
        journeys.ts                    # GET /journeys, POST /journeys, GET /:id, PATCH /:id/status
        protocols.ts                   # GET /protocols, POST, GET /:id, PUT /:id, DELETE /:id
        steps.ts                       # PATCH /steps/:id/complete
        dashboard.ts                   # GET /dashboard/stats
      services/
        journey-service.ts             # Orchestrates engine + db for complete-step flow
        patient-service.ts             # Patient CRUD with DataAccessLog creation
        protocol-service.ts            # Protocol CRUD with active-journey guard
    api/
      index.ts                         # Vercel Function handler wrapping Hono app
    tsconfig.json
    package.json
    vercel.json                        # Routes: /api/* → api/index.ts

packages/
  types/
    src/
      enums.ts                         # StepStatus, JourneyStatus, UserRole, StepType
      patient.ts                       # PatientSchema, CreatePatientSchema, PatientListItemSchema
      journey.ts                       # JourneySchema, CreateJourneySchema, JourneyDetailSchema
      protocol.ts                      # ProtocolSchema, ProtocolStepSchema, CreateProtocolSchema
      snapshot.ts                      # ProtocolSnapshotSchema (immutable journey copy)
      step.ts                          # JourneyStepSchema, CompleteStepSchema, CompleteStepResponseSchema
      dashboard.ts                     # DashboardStatsSchema
      auth.ts                          # JWTPayloadSchema (tenant_id + role claims)
      errors.ts                        # ApiErrorSchema
      index.ts                         # Re-export everything
    tsconfig.json
    package.json

  db/
    prisma/
      schema.prisma                    # All 7 entities; RLS SQL in block comments
      migrations/
        001_initial/
          migration.sql                # CREATE TABLE + ENABLE ROW LEVEL SECURITY + CREATE POLICY
      seed.ts                          # Clínica São Lucas + Hospital Vitória full fixture data
    src/
      client.ts                        # Prisma singleton with tenantId query extension
    tsconfig.json
    package.json

  protocol-engine/
    src/
      types.ts                         # ProtocolSnapshot, JourneyStepState, ProtocolResolution
      resolve-next-steps.ts            # resolveNextSteps(protocol, steps) → ProtocolResolution
      calculate-progress.ts            # calculateProgress(steps) → number (0-100)
      get-unlocked-steps.ts            # getUnlockedSteps(protocol, steps) → ProtocolStepDef[]
      apply-branch-condition.ts        # applyBranchCondition(step, result, protocol) → ProtocolStepDef[]
      index.ts                         # Public exports
    tests/
      resolve-next-steps.test.ts
      calculate-progress.test.ts
      get-unlocked-steps.test.ts
      apply-branch-condition.test.ts
    vitest.config.ts
    tsconfig.json
    package.json

turbo.json                             # Pipeline: build, test, lint with dep graph
pnpm-workspace.yaml                    # Workspace packages list
package.json                           # Root scripts: dev, build, test, lint
.env.example                           # SUPABASE_URL, SUPABASE_ANON_KEY, DATABASE_URL, DIRECT_URL
.gitignore
```

**Structure Decision**: Turborepo monorepo with pnpm workspaces. Apps are independently deployed
to separate Vercel projects pointing at the same repo. Package dependency graph is acyclic:
`apps/web → @avimus/types`, `apps/api → @avimus/types + @avimus/db + @avimus/protocol-engine`,
`packages/db → (none)`, `packages/types → (none)`, `packages/protocol-engine → (none)`. No
circular imports. Cross-boundary imports (Prisma in web, Next.js in engine) are forbidden and
enforced in code review.

## Complexity Tracking

> No Constitution violations. All 7 principles satisfied by the architecture above.
