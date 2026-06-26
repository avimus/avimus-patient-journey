<!--
  Sync Impact Report
  ==================
  Version change: (template) → 1.0.0

  Modified principles: N/A — initial ratification, all principles are new.

  Added sections:
  - Core Principles (7 principles)
  - Architecture & Technology Stack
  - Development Workflow
  - Governance

  Templates reviewed:
  - .specify/templates/plan-template.md    ✅ — Constitution Check placeholder is dynamic;
                                                 no hardcoded references to update.
  - .specify/templates/spec-template.md    ✅ — Generic structure; compatible with this constitution.
  - .specify/templates/tasks-template.md   ✅ — Phase structure accommodates security, typing,
                                                 and engine-decoupling task types.
  - .specify/templates/commands/           ✅ — No command files found; nothing to update.
  - README.md                              ✅ — No root README found; nothing to update.

  Deferred items: None. All placeholders resolved.
-->

# avimus-patient-journey Constitution

## Core Principles

### I. Security First — Multi-Tenant Isolation (NON-NEGOTIABLE)

Every database table MUST have Row Level Security (RLS) enabled in Supabase. Every
query MUST include a tenant filter derived from the authenticated JWT claim `tenant_id`.
No cross-tenant data leakage is acceptable under any circumstance — not in queries,
not in API responses, not in logs, and not in seeds.

JWTs MUST carry a `tenant_id` claim validated on every API request before any database
access occurs. Middleware MUST reject any request missing a valid tenant claim with
HTTP 401. New tables MUST have RLS policies reviewed and confirmed before merge.

**Rationale**: Clinics and hospitals handle sensitive patient data. A single cross-tenant
data exposure is a legal, regulatory, and trust-ending incident.

### II. Protocol Engine Decoupled (NON-NEGOTIABLE)

All logic for advancing protocol steps, resolving branches, and computing the next
clinical action MUST reside exclusively in `packages/protocol-engine`. Controllers
in `apps/api` and components in `apps/web` MUST NOT contain this logic — they call
the engine and present its output.

The engine MUST have zero framework dependencies. It MUST be independently runnable
and testable via `pnpm --filter @avimus/protocol-engine test`. Any feature that
touches clinical flow MUST include engine-level unit tests before merge.

**Rationale**: Clinical protocol logic is the core product value. Keeping it pure and
decoupled means it can be audited, tested in isolation, reused in mobile, and replaced
under the hood without touching the API or UI layers.

### III. Full TypeScript Strict Typing (NON-NEGOTIABLE)

Every package MUST compile with `strict: true` in its `tsconfig.json`. The `any`
type is forbidden. When types are genuinely unknown, use `unknown` with explicit type
guards. Every `@ts-ignore` or `@ts-expect-error` comment MUST be accompanied by a
written justification on the line immediately above it.

Shared contracts between `apps/web` and `apps/api` MUST live in `packages/types`.
Types MUST NOT be duplicated across packages.

**Rationale**: The system integrates clinical data, multi-tenant authorization, and
protocol logic. Type safety is the primary defense against silent data corruption and
contract drift between packages.

### IV. Explicit, Validated API Contracts (NON-NEGOTIABLE)

Every route in `apps/api` MUST define its request and response shapes using Zod
schemas imported from or published to `packages/types`. Validation MUST occur at
the route boundary before business logic executes. Unvalidated input MUST NOT reach
service or engine layers.

The API MUST be versioned under `/api/v1/` from day one. Breaking changes require a
new version prefix. Routes MUST return typed JSON — unstructured error strings are
not acceptable.

**Rationale**: The API is intended to be public and consumed by future mobile apps
and HIS/EHR integrations. Explicit contracts and versioning protect consumers at
every product iteration.

### V. Rich Seed Data

`packages/db` MUST contain a seed script that populates at least two tenant workspaces
with realistic clinical data: patients in active protocols, completed steps, pending
tasks, and branching decision scenarios. The seed MUST be runnable with a single
command (`pnpm --filter @avimus/db seed`) and MUST complete within 60 seconds.

The seeded data MUST be sufficient to demonstrate the complete product flow in a
stakeholder meeting without a live patient dataset or manual data entry.

**Rationale**: Sales demos and investor meetings cannot depend on production data or
manual setup. A complete, runnable seed removes friction from stakeholder meetings,
user research sessions, and developer onboarding.

### VI. Clinical Professional Interface — Clarity Over Aesthetics

The `apps/web` UI MUST prioritize information density and scannability for clinical
staff. Data tables MUST surface relevant status at a glance. Critical alerts and
overdue protocol steps MUST be visually distinct from routine information. Decorative
animations and purely visual flourishes are prohibited unless they directly reduce
cognitive load or prevent error.

All design decisions MUST be justifiable by workflow efficiency, not visual appeal alone.

**Rationale**: Doctors, nurses, and care coordinators operate under time pressure.
Missed information has patient safety consequences. The interface is a clinical tool,
not a marketing page.

### VII. API-First, Prepared for Growth

`apps/api` MUST be the single source of truth for all business logic. `apps/web`
MUST communicate exclusively via the versioned REST API — no shared server-side
functions, no direct database calls from the web layer.

New capabilities MUST be designed API-first: define the contract in `packages/types`,
implement in `apps/api`, then consume in `apps/web`. Any future consumer — mobile app,
HIS integration — MUST be able to adopt any endpoint without requiring a refactor of
the core API.

**Rationale**: A mobile app and HIS/EHR integration are confirmed next steps. Building
API-first from the start prevents the architectural debt of retrofitting a public API
onto a tightly-coupled system.

## Architecture & Technology Stack

Package boundaries are enforced contracts, not organizational conveniences. Code MUST
be placed in the package that owns its concern and nowhere else.

**Monorepo layout (Turborepo):**

```
apps/
  web/              — Next.js 14 App Router. Presentation and API calls only.
  api/              — Hono.js. All business rules, validations, orchestration.
packages/
  types/            — Shared TypeScript contracts (Zod schemas + inferred types).
  db/               — Prisma schema, migrations, and seed. No business logic.
  protocol-engine/  — Clinical protocol logic. Pure TypeScript. Zero framework deps.
```

**Technology stack (binding decisions):**

- Database: Supabase (PostgreSQL with RLS)
- ORM: Prisma (in `packages/db`)
- API framework: Hono.js (in `apps/api`)
- Frontend: Next.js 14 App Router (in `apps/web`)
- Schema validation: Zod (in `packages/types`)
- Monorepo: Turborepo

Cross-boundary imports (e.g., Prisma in `apps/web`, Next.js in `packages/protocol-engine`)
MUST be rejected in code review as boundary violations.

## Development Workflow

**Branching**: Feature branches off `main`. Names follow `###-short-description`
(e.g., `001-patient-protocol-engine`).

**Pull Requests**: Every PR description MUST include a Constitution Check section
explicitly confirming compliance with each applicable principle before merge.
Principle I (RLS/tenant isolation) and Principle II (engine decoupling) MUST be
explicitly verified on every PR that touches data models or clinical protocol flow.

**Blocking merge gates:**

- `packages/protocol-engine`: Unit tests MUST pass for all engine logic changes.
- `apps/api`: Route-level contract and validation tests MUST pass.
- New tables: RLS policy review MUST be documented in the PR before merge.
- `packages/db` changes: Seed MUST run cleanly in CI before merge.
- Breaking API changes: New version prefix and migration guide MUST be included.

## Governance

This constitution supersedes all other coding guidelines, README conventions, and
informal practices. In case of conflict, the constitution wins.

**Amendment procedure:**
1. Open a PR with the proposed change to `.specify/memory/constitution.md`.
2. State the version bump type (MAJOR/MINOR/PATCH) and rationale in the PR description.
3. Update all affected templates in `.specify/templates/` in the same PR.
4. At least one additional reviewer MUST approve before merging.

**Versioning policy:**
- MAJOR: A principle is removed, or redefined in a backward-incompatible way, or
  the tenant isolation model changes.
- MINOR: A new principle or mandatory section is added, or an existing principle
  gains materially new scope.
- PATCH: Clarifications, wording improvements, typo fixes, non-semantic refinements.

**Compliance review**: PR authors are responsible for the Constitution Check section.
Reviewers MUST not approve PRs with missing or unchecked compliance items for
Principles I and II.

**Version**: 1.0.0 | **Ratified**: 2026-06-26 | **Last Amended**: 2026-06-26
