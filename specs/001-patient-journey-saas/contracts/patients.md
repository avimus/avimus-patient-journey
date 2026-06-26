# API Contract: /api/v1/patients

All routes require a valid Supabase JWT with `tenant_id` claim.
Responses are typed via Zod schemas in `packages/types/src/patient.ts`.

---

## GET /api/v1/patients

List all patients for the authenticated tenant. Supports search and pagination.

### Request

| Header | Value |
|--------|-------|
| Authorization | `Bearer {supabase_jwt}` |

| Query Param | Type | Required | Default | Notes |
|-------------|------|----------|---------|-------|
| search | string | no | — | Partial match on fullName or CPF |
| page | number | no | 1 | Page number (1-indexed) |
| limit | number | no | 20 | Max 100 |

### Response 200

```typescript
// packages/types/src/patient.ts
export const PatientListResponseSchema = z.object({
  data: z.array(z.object({
    id: z.string().uuid(),
    fullName: z.string(),
    cpf: z.string(),
    birthDate: z.string().datetime(),
    activeJourney: z.object({
      id: z.string().uuid(),
      protocolName: z.string(),
      currentStepName: z.string().nullable(),
      status: JourneyStatusSchema,
      isOverdue: z.boolean(),
      updatedAt: z.string().datetime(),
    }).nullable(),
  })),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
})
```

### Response 401
```json
{ "error": "Unauthorized", "code": "MISSING_TOKEN" }
```

---

## GET /api/v1/patients/:id

Fetch a single patient with their journey history.

### Response 200

```typescript
export const PatientDetailSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  cpf: z.string(),
  birthDate: z.string().datetime(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  lgpdLegalBasis: z.string(),
  createdAt: z.string().datetime(),
  journeys: z.array(z.object({
    id: z.string().uuid(),
    protocolName: z.string(),
    status: JourneyStatusSchema,
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime().nullable(),
    progress: z.number().min(0).max(100),
  })),
})
```

### Response 404
```json
{ "error": "Patient not found", "code": "NOT_FOUND" }
```

---

## POST /api/v1/patients

Create a new patient. Requires role `admin` or `medico`.

### Request Body

```typescript
export const CreatePatientSchema = z.object({
  fullName: z.string().min(2).max(200),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
  birthDate: z.string().datetime(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  lgpdLegalBasis: z.string().default("tratamento de saúde — art. 11, II, f, LGPD"),
})
```

### Response 201

```typescript
export const PatientSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  fullName: z.string(),
  cpf: z.string(),
  birthDate: z.string().datetime(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  lgpdLegalBasis: z.string(),
  createdAt: z.string().datetime(),
})
```

### Response 409
```json
{ "error": "CPF já cadastrado para este tenant", "code": "DUPLICATE_CPF" }
```

### Response 403
```json
{ "error": "Role insuficiente", "code": "INSUFFICIENT_ROLE" }
```
