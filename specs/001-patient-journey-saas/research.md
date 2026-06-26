# Research: Plataforma SaaS de Gestão de Jornada Clínica

**Phase**: 0 — Technical Decisions | **Date**: 2026-06-26

All decisions below are final for the MVP scope. No NEEDS CLARIFICATION items remain.

---

## Decision 1: Hono.js on Vercel Functions

**Decision**: Use `hono/vercel` adapter to expose the Hono app as a single Vercel Function
catching all `/api/*` routes.

**Implementation**:
```typescript
// apps/api/api/index.ts
import { handle } from 'hono/vercel'
import { app } from '../src/index'

export const config = { runtime: 'nodejs18.x' }
export default handle(app)
```
```json
// apps/api/vercel.json
{
  "rewrites": [{ "source": "/api/:path*", "destination": "/api/index" }]
}
```

**Rationale**: Single entry point simplifies Vercel configuration. The Hono app handles its own
routing internally, so adding routes does not require vercel.json changes. `nodejs18.x` runtime
is stable and supports all required Node.js APIs.

**Alternatives considered**:
- Individual Vercel Functions per route — rejected because it creates N files to maintain and
  cannot share middleware state cleanly.
- Edge runtime — rejected because Prisma requires Node.js runtime; edge would force a different
  ORM or HTTP-based DB client.

---

## Decision 2: Prisma + Supabase RLS Strategy

**Decision**: Prisma connects via the service role key (bypasses RLS). A custom Prisma query
extension in `packages/db/src/client.ts` automatically adds `where: { tenantId }` to every
`findMany`, `findFirst`, `findUnique`, `update`, `delete`, and `deleteMany` call. Supabase RLS
policies are still enabled on all tables as a defence-in-depth layer.

**Implementation pattern**:
```typescript
// packages/db/src/client.ts
export function createPrismaClient(tenantId: string) {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async findMany({ args, query }) {
          args.where = { ...args.where, tenantId }
          return query(args)
        },
        // ... same for findFirst, findUnique, update, delete
      }
    }
  })
}
```

**Rationale**: Prisma does not natively support setting PostgreSQL session variables
(`SET LOCAL`) per-query in a connection pool, which would be required to activate
`auth.jwt()` for Supabase RLS when using direct Prisma connections. The extension approach
provides equivalent guarantee at the application layer with better TypeScript integration and
testability. RLS remains as a database-level safety net.

**RLS policies** (defined in migration SQL, enforced as secondary guard):
```sql
-- Example for patients table
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON patients
  USING (tenant_id::text = auth.jwt() ->> 'tenant_id');
```

**Alternatives considered**:
- `SET LOCAL request.jwt.claims` before each Prisma query — rejected because Prisma's
  connection pooler reuses connections and session-scoped SET values leak between requests.
- Supabase JS client for all DB operations — rejected because it lacks Prisma's type safety
  and schema migration capabilities needed for this project's complexity.

---

## Decision 3: Supabase Auth + JWT Custom Template

**Decision**: Configure a custom JWT template in the Supabase Dashboard that includes
`tenant_id` and `role` from the `public.users` table. The `public.users` table mirrors
`auth.users` with additional fields (role, tenant_id, name), linked via matching `id`.

**JWT payload shape**:
```json
{
  "sub": "uuid-of-auth-user",
  "email": "user@clinic.com",
  "tenant_id": "uuid-of-tenant",
  "role": "medico",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Supabase JWT Template SQL** (set in Dashboard → Authentication → JWT Template):
```sql
select
  u.tenant_id::text as tenant_id,
  u.role as role
from public.users u
where u.id = auth.uid()
```

**User creation flow**: On Supabase Auth signup/invite, a database trigger on `auth.users`
inserts a row into `public.users` with the provided `tenant_id` and `role` from user metadata.
Alternatively, admins create users via Supabase Admin API with `user_metadata: { tenant_id, role }`.

**Rationale**: Custom JWT claims allow middleware in both Next.js and Hono to extract tenant
context from the token without an extra DB lookup on every request. Eliminates a DB round-trip
per request, keeps authorization stateless.

**Alternatives considered**:
- Store tenant_id only in user_metadata and look up per request — rejected because it adds
  latency and creates a DB dependency in the auth middleware path.
- Separate identity service — rejected as out-of-scope complexity for the MVP.

---

## Decision 4: Next.js Middleware Session Validation

**Decision**: Use `@supabase/ssr` to create a server-side Supabase client in Next.js middleware.
Middleware runs on every request to `(protected)` routes, validates the session, and extracts
tenant_id from the JWT. Unauthenticated requests are redirected to `/login`.

**Implementation pattern**:
```typescript
// apps/web/src/middleware.ts
import { createMiddlewareClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient({ req: request, res: NextResponse.next() })
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) return NextResponse.redirect(new URL('/login', request.url))
  
  // Validate tenant_id claim exists
  const tenantId = session.user.user_metadata.tenant_id ?? 
                   (session.user as unknown as { tenant_id?: string }).tenant_id
  if (!tenantId) return NextResponse.redirect(new URL('/login', request.url))
  
  return response
}

export const config = { matcher: ['/(protected)/:path*'] }
```

**Rationale**: Middleware runs at the Edge before any page renders, ensuring protected routes
are never accessible without a valid session. The session refresh logic in `@supabase/ssr`
handles token rotation automatically.

---

## Decision 5: Protocol Engine Type Design

**Decision**: The engine operates exclusively on `ProtocolSnapshot` (the immutable JSON copy
stored in `PatientJourney.protocolSnapshot`) and `JourneyStepState[]` (the mutable current
state of each step). The engine never touches the database — it is called by `apps/api`
services with pre-fetched data and returns results that the service persists.

**Core type contract**:
```typescript
// packages/protocol-engine/src/types.ts
export type StepStatus = 'bloqueado' | 'pendente' | 'em_andamento' | 'concluido' | 'ignorado'
export type StepType = 'consulta' | 'exame' | 'diagnostico' | 'procedimento' | 'retorno'
export type BranchConditions = Record<string, string[]>  // result → stepIds to unlock

export type ProtocolStepDef = {
  id: string
  name: string
  type: StepType
  orderIndex: number
  prerequisiteStepIds: string[]
  branchConditions: BranchConditions
  dueDays?: number
}

export type ProtocolSnapshot = {
  id: string
  name: string
  steps: ProtocolStepDef[]
}

export type JourneyStepState = {
  protocolStepId: string
  status: StepStatus
  result?: string
}

export type ProtocolResolution = {
  unlockedStepIds: string[]   // Steps whose prerequisites are now satisfied
  ignoredStepIds: string[]    // Steps bypassed by branch condition
  nextStepId: string | null   // First 'pendente' step; null if journey complete
}
```

**Branch logic rule**: When a step with `branchConditions` is completed with a given result,
the engine reads `branchConditions[result]` to get the IDs of steps to unlock. All other steps
that would have been unlocked by this step under a different result are marked `ignorado`. If
the result matches no condition key, no steps are unlocked and the service flags the step for
manual review (returns an empty `unlockedStepIds` with `nextStepId: null`).

**Progress calculation rule**: `(concluido_count / total_relevant_count) * 100`, where
`total_relevant_count` excludes `ignorado` steps. A journey is 100% complete when all
non-ignored steps are `concluido`.

---

## Decision 6: Turborepo Pipeline Configuration

**Decision**: Define three pipelines in `turbo.json`: `build` (apps depend on packages),
`test` (each package independent), `lint` (fully parallel).

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": [],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": [],
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Rationale**: `^build` ensures packages build before apps that depend on them. Tests run
independently — protocol-engine tests can run without building the API. `dev` is persistent
and cache-disabled for live reloading.

---

## Decision 7: Seed Data Design

**Decision**: The seed creates two complete, isolated tenant workspaces using realistic
Brazilian clinical data. Passwords for all demo users are `Demo@123456` (configured in
Supabase via Admin API in the seed).

**Seed structure**:
- **Clínica São Lucas** (slug: `clinica-sao-lucas`):
  - Protocolo: Cólica Renal (9 steps, branching at step 5 — Diagnóstico Médico)
  - Protocolo: Hipertensão Arterial (6 steps, linear)
  - 8 patients with varied journey stages across both protocols
  - Users: Dr. Ricardo Alves (admin), Dra. Fernanda Costa (medico), Carla Souza (recepcionista)

- **Hospital Vitória** (slug: `hospital-vitoria`):
  - Same 2 protocols (independent copies owned by this tenant)
  - 8 different patients
  - Users: Dr. Paulo Mendes (admin), Dra. Ana Lima (medico), João Oliveira (recepcionista)

**Journey stage distribution** (per tenant, across all active journeys):
- 2 patients: step 1 completed, step 2 pending (early stage)
- 2 patients: step 3 in progress (mid stage)
- 1 patient: branching decision completed → surgical path active
- 1 patient: branching decision completed → conservative path active
- 1 patient: all steps completed (100%)
- 1 patient: journey suspended

This ensures all 5 step status values and all 4 journey status values are represented in
the seed, covering every visual state in the UI.
