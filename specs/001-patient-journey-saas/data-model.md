# Data Model: Plataforma SaaS de Gestão de Jornada Clínica

**Phase**: 1 — Design | **Date**: 2026-06-26

---

## Entity Overview

```
Tenant ──< User
Tenant ──< Patient ──< PatientJourney ──< JourneyStep
Tenant ──< Protocol ──< ProtocolStep
PatientJourney >── Protocol  (FK preserved; snapshot is the source of truth for logic)
PatientJourney uses ProtocolSnapshot (immutable JSON copy at assignment time)
DataAccessLog >── Tenant, User, Patient
```

---

## Entity Definitions

### Tenant

Represents a clinic or hospital. Isolation boundary for all data.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default uuid() | |
| name | String | NOT NULL | Display name, e.g. "Clínica São Lucas" |
| slug | String | UNIQUE, NOT NULL | URL-safe identifier, e.g. "clinica-sao-lucas" |
| plan | String | NOT NULL, default "starter" | Subscription plan |
| createdAt | DateTime | NOT NULL, default now() | |

**RLS**: No tenant-based isolation on this table — it is the root reference. `SELECT` policy
allows any authenticated user to read their own tenant row (`id = (auth.jwt() ->> 'tenant_id')::uuid`).

---

### User

Healthcare professional. Linked to `auth.users` via matching `id`. The JWT template reads
`tenant_id` and `role` from this table.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK — matches auth.users.id | |
| tenantId | UUID | FK → Tenant.id, NOT NULL | |
| email | String | NOT NULL | Mirrors auth.users.email |
| name | String | NOT NULL | Full display name |
| role | Enum | NOT NULL | `admin`, `medico`, `recepcionista`, `enfermeiro` |
| createdAt | DateTime | NOT NULL, default now() | |

**Unique constraint**: `(tenantId, email)`
**Index**: `tenantId`

**RLS**:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON users
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Role permissions**:
- `admin`: full access including Protocol management and journey status transitions
- `medico`: can complete any step type; can create PatientJourney
- `recepcionista`: can complete steps of type `consulta` and `retorno`
- `enfermeiro`: can complete steps of type `procedimento` and `exame`

---

### Patient

Patient record. Contains sensitive health data; all access logged to DataAccessLog.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default uuid() | |
| tenantId | UUID | FK → Tenant.id, NOT NULL | |
| fullName | String | NOT NULL | |
| cpf | String | NOT NULL | Format: 000.000.000-00; unique per tenant |
| birthDate | DateTime | NOT NULL | |
| contactPhone | String? | nullable | |
| contactEmail | String? | nullable | |
| lgpdLegalBasis | String | NOT NULL | default: "tratamento de saúde — art. 11, II, f, LGPD" |
| createdAt | DateTime | NOT NULL, default now() | |

**Unique constraint**: `(tenantId, cpf)`
**Index**: `tenantId`

**RLS**:
```sql
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON patients
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

---

### Protocol

Reusable clinical flow template owned by a tenant. Once it has active journeys, structural
edits are blocked (new journeys must be created to use the updated version).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default uuid() | |
| tenantId | UUID | FK → Tenant.id, NOT NULL | |
| name | String | NOT NULL | e.g. "Protocolo de Cólica Renal" |
| description | String? | nullable | |
| isActive | Boolean | NOT NULL, default true | Soft-delete equivalent |
| createdAt | DateTime | NOT NULL, default now() | |
| updatedAt | DateTime | NOT NULL, updatedAt | |

**Index**: `tenantId`

**RLS**:
```sql
ALTER TABLE protocols ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON protocols
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Business rule**: Deletion blocked if any PatientJourney with `status IN ('ativo', 'suspenso')`
references this protocol. Enforced in `apps/api/src/services/protocol-service.ts`.

---

### ProtocolStep

Individual step definition within a Protocol. Contains branching logic.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default uuid() | |
| protocolId | UUID | FK → Protocol.id, NOT NULL | |
| tenantId | UUID | NOT NULL | Denormalized for RLS; matches Protocol.tenantId |
| name | String | NOT NULL | e.g. "Exame Laboratorial" |
| type | Enum | NOT NULL | `consulta`, `exame`, `diagnostico`, `procedimento`, `retorno` |
| orderIndex | Int | NOT NULL | Display and default execution order |
| prerequisiteStepIds | String[] | NOT NULL, default [] | IDs of steps that must be `concluido` first |
| branchConditions | Json | NOT NULL, default {} | `Record<string, string[]>` — result → unlocked step IDs |
| dueDays | Int? | nullable | Max days from journey start to complete this step |
| createdAt | DateTime | NOT NULL, default now() | |

**Index**: `protocolId`, `tenantId`

**RLS**:
```sql
ALTER TABLE protocol_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON protocol_steps
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**branchConditions example** (for a Diagnóstico step):
```json
{
  "cirurgico": ["step-6b-id", "step-7b-id", "step-8b-id", "step-9b-id"],
  "conservador": ["step-6a-id", "step-7a-id"]
}
```

When this step is completed with result `"cirurgico"`, the engine unlocks steps 6B–9B and
marks 6A, 7A as `ignorado`.

---

### PatientJourney

Instance of a Protocol assigned to a Patient. Contains an immutable snapshot of the full
protocol structure at assignment time. All clinical logic operates on the snapshot, never
on the live Protocol.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default uuid() | |
| tenantId | UUID | FK → Tenant.id, NOT NULL | |
| patientId | UUID | FK → Patient.id, NOT NULL | |
| protocolId | UUID | FK → Protocol.id, NOT NULL | Reference only; logic uses snapshot |
| protocolSnapshot | Json | NOT NULL | Full ProtocolSnapshot at assignment time |
| status | Enum | NOT NULL, default "ativo" | `ativo`, `concluido`, `suspenso`, `cancelado` |
| startedAt | DateTime | NOT NULL, default now() | |
| completedAt | DateTime? | nullable | Set when status transitions to `concluido` |
| createdAt | DateTime | NOT NULL, default now() | |
| createdById | UUID | FK → User.id, NOT NULL | Who created the journey |

**Index**: `tenantId`, `patientId`

**RLS**:
```sql
ALTER TABLE patient_journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON patient_journeys
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Status transitions** (enforced in journey-service.ts):
```
ativo → suspenso    (admin only)
suspenso → ativo    (admin only)
ativo → cancelado   (admin only)
suspenso → cancelado (admin only)
any → concluido     (automatic, by engine when all non-ignored steps are concluido)
```
`cancelado` is a terminal state. No transitions out of `cancelado`.

**Journey creation flow**:
1. Fetch Protocol + all ProtocolSteps
2. Build ProtocolSnapshot JSON
3. Create PatientJourney with snapshot
4. Create JourneyStep rows for every ProtocolStep with status `bloqueado`
5. Run `getUnlockedSteps` on the new journey to set initial `pendente` steps
6. Log DataAccessLog for journey creation

---

### JourneyStep

Mutable state of a single protocol step within a specific journey. Updated when a
professional records step completion.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default uuid() | |
| tenantId | UUID | NOT NULL | Denormalized for RLS |
| journeyId | UUID | FK → PatientJourney.id, NOT NULL | |
| protocolStepId | String | NOT NULL | ID from ProtocolSnapshot (not a FK to ProtocolStep) |
| status | Enum | NOT NULL, default "bloqueado" | `bloqueado`, `pendente`, `em_andamento`, `concluido`, `ignorado` |
| executedAt | DateTime? | nullable | When the step was completed |
| executedById | UUID? | FK → User.id, nullable | Who completed it |
| result | String? | nullable | Text for most types; must match a branchConditions key for `diagnostico` |
| notes | String? | nullable | Optional freeform professional notes |
| createdAt | DateTime | NOT NULL, default now() | |
| updatedAt | DateTime | NOT NULL, updatedAt | |

**Unique constraint**: `(journeyId, protocolStepId)` — one row per step per journey
**Index**: `tenantId`, `journeyId`

**RLS**:
```sql
ALTER TABLE journey_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON journey_steps
  USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
```

**Concurrency control**: The `complete step` endpoint uses an optimistic lock — it selects
the step with `status NOT IN ('concluido', 'ignorado')` inside a transaction. If another
request has already completed it, the select returns nothing and the service returns HTTP 409
with the current step state.

---

### DataAccessLog

Immutable audit log. Created on every read or write of Patient and JourneyStep data.
Satisfies LGPD minimum operational requirement (art. 37).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | UUID | PK, default uuid() | |
| tenantId | UUID | FK → Tenant.id, NOT NULL | |
| userId | UUID | FK → User.id, NOT NULL | Who performed the action |
| patientId | UUID | FK → Patient.id, NOT NULL | Which patient was accessed |
| action | String | NOT NULL | `VIEW_PATIENT`, `VIEW_JOURNEY`, `COMPLETE_STEP`, `CREATE_PATIENT`, `CREATE_JOURNEY`, `SUSPEND_JOURNEY`, `CANCEL_JOURNEY` |
| resourceType | String | NOT NULL | `patient`, `journey`, `step` |
| resourceId | String | NOT NULL | UUID of the accessed resource |
| timestamp | DateTime | NOT NULL, default now() | |

**Index**: `tenantId`, `patientId`

**No UPDATE or DELETE policies** — rows are insert-only. Enforced via RLS:
```sql
ALTER TABLE data_access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_read" ON data_access_logs
  FOR SELECT USING (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
CREATE POLICY "tenant_insert" ON data_access_logs
  FOR INSERT WITH CHECK (tenant_id = (auth.jwt() ->> 'tenant_id')::uuid);
-- No UPDATE or DELETE policies — implicit deny
```

---

## State Machines

### JourneyStep Status

```
       [creation]
           ↓
       bloqueado ──(prerequisites met)──→ pendente
                                              ↓
                                         em_andamento ──(professional completes)──→ concluido
                                              ↓
                                          ignorado  ←──(branch condition bypasses this step)
```

Transitions:
- `bloqueado → pendente`: Engine detects all prerequisiteStepIds are `concluido`
- `pendente → em_andamento`: Not enforced in MVP — treated as equivalent to pendente for now
- `pendente/em_andamento → concluido`: Professional calls complete-step endpoint
- `bloqueado/pendente → ignorado`: Engine marks steps bypassed by a branch condition

### PatientJourney Status

```
ativo ──(admin)──→ suspenso ──(admin)──→ ativo
  │                   │
  └──(admin)──→ cancelado ←──(admin)──┘
  │
  └──(engine, automatic)──→ concluido
```

---

## Prisma Schema (Reference)

```prisma
// packages/db/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Tenant {
  id         String           @id @default(uuid())
  name       String
  slug       String           @unique
  plan       String           @default("starter")
  createdAt  DateTime         @default(now()) @map("created_at")
  users      User[]
  patients   Patient[]
  protocols  Protocol[]
  journeys   PatientJourney[]
  accessLogs DataAccessLog[]
  @@map("tenants")
}

model User {
  id         String           @id
  tenantId   String           @map("tenant_id")
  email      String
  name       String
  role       String           // admin | medico | recepcionista | enfermeiro
  createdAt  DateTime         @default(now()) @map("created_at")
  tenant     Tenant           @relation(fields: [tenantId], references: [id])
  journeys   PatientJourney[] @relation("CreatedBy")
  steps      JourneyStep[]
  accessLogs DataAccessLog[]
  @@unique([tenantId, email])
  @@index([tenantId])
  @@map("users")
}

model Patient {
  id             String           @id @default(uuid())
  tenantId       String           @map("tenant_id")
  fullName       String           @map("full_name")
  cpf            String
  birthDate      DateTime         @map("birth_date")
  contactPhone   String?          @map("contact_phone")
  contactEmail   String?          @map("contact_email")
  lgpdLegalBasis String           @default("tratamento de saúde — art. 11, II, f, LGPD") @map("lgpd_legal_basis")
  createdAt      DateTime         @default(now()) @map("created_at")
  tenant         Tenant           @relation(fields: [tenantId], references: [id])
  journeys       PatientJourney[]
  accessLogs     DataAccessLog[]
  @@unique([tenantId, cpf])
  @@index([tenantId])
  @@map("patients")
}

model Protocol {
  id          String           @id @default(uuid())
  tenantId    String           @map("tenant_id")
  name        String
  description String?
  isActive    Boolean          @default(true) @map("is_active")
  createdAt   DateTime         @default(now()) @map("created_at")
  updatedAt   DateTime         @updatedAt @map("updated_at")
  tenant      Tenant           @relation(fields: [tenantId], references: [id])
  steps       ProtocolStep[]
  journeys    PatientJourney[]
  @@index([tenantId])
  @@map("protocols")
}

model ProtocolStep {
  id                  String   @id @default(uuid())
  protocolId          String   @map("protocol_id")
  tenantId            String   @map("tenant_id")
  name                String
  type                String   // consulta | exame | diagnostico | procedimento | retorno
  orderIndex          Int      @map("order_index")
  prerequisiteStepIds String[] @default([]) @map("prerequisite_step_ids")
  branchConditions    Json     @default("{}") @map("branch_conditions")
  dueDays             Int?     @map("due_days")
  createdAt           DateTime @default(now()) @map("created_at")
  protocol            Protocol @relation(fields: [protocolId], references: [id])
  @@index([protocolId])
  @@index([tenantId])
  @@map("protocol_steps")
}

model PatientJourney {
  id               String        @id @default(uuid())
  tenantId         String        @map("tenant_id")
  patientId        String        @map("patient_id")
  protocolId       String        @map("protocol_id")
  protocolSnapshot Json          @map("protocol_snapshot")
  status           String        @default("ativo")
  startedAt        DateTime      @default(now()) @map("started_at")
  completedAt      DateTime?     @map("completed_at")
  createdAt        DateTime      @default(now()) @map("created_at")
  createdById      String        @map("created_by_id")
  tenant           Tenant        @relation(fields: [tenantId], references: [id])
  patient          Patient       @relation(fields: [patientId], references: [id])
  protocol         Protocol      @relation(fields: [protocolId], references: [id])
  createdBy        User          @relation("CreatedBy", fields: [createdById], references: [id])
  steps            JourneyStep[]
  @@index([tenantId])
  @@index([patientId])
  @@map("patient_journeys")
}

model JourneyStep {
  id             String         @id @default(uuid())
  tenantId       String         @map("tenant_id")
  journeyId      String         @map("journey_id")
  protocolStepId String         @map("protocol_step_id")
  status         String         @default("bloqueado")
  executedAt     DateTime?      @map("executed_at")
  executedById   String?        @map("executed_by_id")
  result         String?
  notes          String?
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")
  journey        PatientJourney @relation(fields: [journeyId], references: [id])
  executedBy     User?          @relation(fields: [executedById], references: [id])
  @@unique([journeyId, protocolStepId])
  @@index([tenantId])
  @@index([journeyId])
  @@map("journey_steps")
}

model DataAccessLog {
  id           String   @id @default(uuid())
  tenantId     String   @map("tenant_id")
  userId       String   @map("user_id")
  patientId    String   @map("patient_id")
  action       String
  resourceType String   @map("resource_type")
  resourceId   String   @map("resource_id")
  timestamp    DateTime @default(now())
  tenant       Tenant   @relation(fields: [tenantId], references: [id])
  user         User     @relation(fields: [userId], references: [id])
  patient      Patient  @relation(fields: [patientId], references: [id])
  @@index([tenantId])
  @@index([patientId])
  @@map("data_access_logs")
}
```
