# API Contract: /api/v1/protocols

All routes require a valid Supabase JWT with `tenant_id` claim.
Protocol creation and modification requires role `admin`.
Responses typed via `packages/types/src/protocol.ts`.

---

## GET /api/v1/protocols

List all protocols for the authenticated tenant.

### Response 200

```typescript
export const ProtocolListResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    isActive: z.boolean(),
    stepCount: z.number().int(),
    activeJourneyCount: z.number().int(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })),
})
```

---

## GET /api/v1/protocols/:id

Fetch a protocol with all its steps.

### Response 200

```typescript
export const ProtocolDetailSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  steps: z.array(ProtocolStepSchema),
})

export const ProtocolStepSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: StepTypeSchema,
  orderIndex: z.number().int(),
  prerequisiteStepIds: z.array(z.string().uuid()),
  branchConditions: z.record(z.string(), z.array(z.string())),
  dueDays: z.number().int().nullable(),
})
```

### Response 404
```json
{ "error": "Protocol not found", "code": "NOT_FOUND" }
```

---

## POST /api/v1/protocols

Create a new protocol with its steps. Requires role `admin`.

### Request Body

```typescript
export const CreateProtocolSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  steps: z.array(z.object({
    name: z.string().min(1).max(200),
    type: StepTypeSchema,
    orderIndex: z.number().int().min(1),
    prerequisiteStepIds: z.array(z.string()).default([]),
    branchConditions: z.record(z.string(), z.array(z.string())).default({}),
    dueDays: z.number().int().positive().optional(),
  })).min(1),
})
```

Note: `prerequisiteStepIds` in the request body use zero-based position references
(e.g., `"0"` means step at index 0). The server resolves these to real UUIDs after
creating the steps.

### Response 201

Returns the full `ProtocolDetailSchema`.

### Response 403
```json
{ "error": "Apenas administradores podem criar protocolos", "code": "INSUFFICIENT_ROLE" }
```

---

## PUT /api/v1/protocols/:id

Update a protocol's metadata and steps. Requires role `admin`. Blocked if the protocol
has active or suspended journeys (to protect existing journeys using the current version).

### Request Body

Same schema as `CreateProtocolSchema`.

### Response 200

Returns the full `ProtocolDetailSchema`.

### Response 409
```json
{
  "error": "Protocolo possui jornadas ativas. Crie uma nova versão do protocolo.",
  "code": "PROTOCOL_HAS_ACTIVE_JOURNEYS",
  "activeJourneyCount": 3
}
```

### Response 403
```json
{ "error": "Apenas administradores podem editar protocolos", "code": "INSUFFICIENT_ROLE" }
```

---

## DELETE /api/v1/protocols/:id

Soft-delete a protocol (sets `isActive = false`). Requires role `admin`.
Hard deletion is not supported. Blocked if the protocol has active or suspended journeys.

### Response 200
```json
{ "id": "uuid", "isActive": false }
```

### Response 409
```json
{
  "error": "Protocolo possui jornadas ativas e não pode ser desativado.",
  "code": "PROTOCOL_HAS_ACTIVE_JOURNEYS",
  "activeJourneyCount": 2
}
```

### Response 403
```json
{ "error": "Apenas administradores podem remover protocolos", "code": "INSUFFICIENT_ROLE" }
```
