# API Contract: /api/v1/journeys

All routes require a valid Supabase JWT with `tenant_id` claim.
Responses are typed via Zod schemas in `packages/types/src/journey.ts`.

---

## GET /api/v1/journeys

List journeys for the authenticated tenant. Supports filtering by patient or status.

### Query Params

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| patientId | UUID | no | Filter by patient |
| status | JourneyStatus | no | Filter: `ativo`, `concluido`, `suspenso`, `cancelado` |
| page | number | no | Default 1 |
| limit | number | no | Default 20, max 100 |

### Response 200

```typescript
export const JourneyListResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string().uuid(),
    patientId: z.string().uuid(),
    patientName: z.string(),
    protocolName: z.string(),
    status: JourneyStatusSchema,
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    progress: z.number().min(0).max(100),
    isOverdue: z.boolean(),
    currentStepName: z.string().nullable(),
    updatedAt: z.string().datetime(),
  })),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
})
```

---

## GET /api/v1/journeys/:id

Fetch journey detail with all steps and protocol snapshot. Creates a DataAccessLog
entry (action: VIEW_JOURNEY).

### Response 200

```typescript
export const JourneyDetailSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  patientName: z.string(),
  protocolId: z.string().uuid(),
  protocolName: z.string(),
  protocolSnapshot: ProtocolSnapshotSchema,
  status: JourneyStatusSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  progress: z.number().min(0).max(100),  // Computed by protocol-engine
  nextStepId: z.string().uuid().nullable(),
  steps: z.array(JourneyStepSchema),
})

export const JourneyStepSchema = z.object({
  id: z.string().uuid(),
  protocolStepId: z.string(),
  status: StepStatusSchema,
  executedAt: z.string().datetime().nullable(),
  executedByName: z.string().nullable(),
  result: z.string().nullable(),
  notes: z.string().nullable(),
  // Denormalized from snapshot for UI rendering:
  stepName: z.string(),
  stepType: StepTypeSchema,
  stepOrderIndex: z.number().int(),
  prerequisiteStepIds: z.array(z.string()),
  branchConditions: z.record(z.string(), z.array(z.string())),
  dueDays: z.number().int().nullable(),
  isOverdue: z.boolean(),
})
```

### Response 404
```json
{ "error": "Journey not found", "code": "NOT_FOUND" }
```

---

## POST /api/v1/journeys

Create a PatientJourney: assign a protocol to a patient. Requires role `admin` or `medico`.
Captures ProtocolSnapshot at creation time. Creates all JourneyStep rows. Logs DataAccessLog
(action: CREATE_JOURNEY).

### Request Body

```typescript
export const CreateJourneySchema = z.object({
  patientId: z.string().uuid(),
  protocolId: z.string().uuid(),
})
```

### Response 201

Returns the full `JourneyDetailSchema` (same as GET /journeys/:id).

### Response 404
```json
{ "error": "Patient or Protocol not found", "code": "NOT_FOUND" }
```

### Response 409
```json
{ "error": "Paciente já possui jornada ativa neste protocolo", "code": "DUPLICATE_ACTIVE_JOURNEY" }
```

### Response 403
```json
{ "error": "Role insuficiente", "code": "INSUFFICIENT_ROLE" }
```

---

## PATCH /api/v1/journeys/:id/status

Change journey status. Requires role `admin`. Allowed transitions:
- `ativo → suspenso`
- `suspenso → ativo`
- `ativo → cancelado`
- `suspenso → cancelado`

The `concluido` status is set automatically by the engine and cannot be set via this endpoint.

### Request Body

```typescript
export const UpdateJourneyStatusSchema = z.object({
  status: z.enum(['ativo', 'suspenso', 'cancelado']),
})
```

### Response 200

```typescript
export const JourneyStatusResponseSchema = z.object({
  id: z.string().uuid(),
  status: JourneyStatusSchema,
  updatedAt: z.string().datetime(),
})
```

### Response 409
```json
{ "error": "Transição de status inválida: cancelado → ativo", "code": "INVALID_TRANSITION" }
```

### Response 403
```json
{ "error": "Apenas administradores podem alterar o status da jornada", "code": "INSUFFICIENT_ROLE" }
```
