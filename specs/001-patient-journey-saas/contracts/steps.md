# API Contract: /api/v1/steps

All routes require a valid Supabase JWT with `tenant_id` claim.
Responses typed via `packages/types/src/step.ts`.

---

## PATCH /api/v1/steps/:id/complete

Complete a JourneyStep. This is the core write operation of the platform.

The server executes this flow atomically:
1. Load JourneyStep; verify `status` is `pendente` or `em_andamento` (reject if `concluido` or `ignorado`)
2. Validate caller has permission for this step type (role check)
3. Validate the journey is in `ativo` status
4. For `diagnostico` steps: validate `result` is a key in `step.branchConditions` (or empty branchConditions)
5. Mark the step `concluido`, set `executedAt`, `executedById`, `result`, `notes`
6. Call `resolveNextSteps(protocolSnapshot, updatedSteps)` from protocol-engine
7. Update unlocked steps to `pendente`, ignored steps to `ignorado`
8. If `resolveNextSteps` returns `nextStepId: null` and all non-ignored steps are `concluido`:
   set `PatientJourney.status = 'concluido'` and `completedAt`
9. Recalculate `calculateProgress(updatedSteps)` for response
10. Log `DataAccessLog` (action: `COMPLETE_STEP`)
11. Return the updated journey state

### Request Body

```typescript
// packages/types/src/step.ts
export const CompleteStepSchema = z.object({
  result: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
})
```

### Response 200

```typescript
export const CompleteStepResponseSchema = z.object({
  completedStep: z.object({
    id: z.string().uuid(),
    status: z.literal('concluido'),
    executedAt: z.string().datetime(),
    executedByName: z.string(),
    result: z.string().nullable(),
    notes: z.string().nullable(),
  }),
  unlockedStepIds: z.array(z.string().uuid()),
  ignoredStepIds: z.array(z.string().uuid()),
  nextStepId: z.string().uuid().nullable(),
  progress: z.number().min(0).max(100),
  journeyStatus: JourneyStatusSchema,
})
```

### Response 409 — Already completed

Returned when another professional already completed this step. The UI should
refresh journey state with the data in this response.

```typescript
z.object({
  error: z.literal("Etapa já concluída"),
  code: z.literal("STEP_ALREADY_COMPLETED"),
  completedBy: z.string(),       // Name of the professional who completed it
  completedAt: z.string().datetime(),
  currentStep: JourneyStepSchema,
})
```

### Response 409 — Journey suspended

```json
{
  "error": "Jornada suspensa. Contate o administrador.",
  "code": "JOURNEY_SUSPENDED"
}
```

### Response 409 — Prerequisites not met

```json
{
  "error": "Pré-requisitos não satisfeitos",
  "code": "PREREQUISITES_NOT_MET",
  "blockedByStepIds": ["uuid-1", "uuid-2"]
}
```

### Response 422 — Invalid diagnostic result

Returned when completing a `diagnostico` step with a result not in its `branchConditions`.

```json
{
  "error": "Resultado não previsto nas condições de ramificação. Etapa marcada para revisão.",
  "code": "UNMATCHED_BRANCH_RESULT",
  "validResults": ["cirurgico", "conservador"]
}
```

### Response 403 — Role mismatch

```json
{
  "error": "Role insuficiente para este tipo de etapa",
  "code": "INSUFFICIENT_ROLE",
  "stepType": "diagnostico",
  "requiredRoles": ["admin", "medico"],
  "yourRole": "recepcionista"
}
```

### Response 404
```json
{ "error": "Step not found", "code": "NOT_FOUND" }
```

---

## Role × Step Type Matrix

| Step Type | admin | medico | recepcionista | enfermeiro |
|-----------|-------|--------|---------------|------------|
| consulta | ✅ | ✅ | ✅ | ❌ |
| exame | ✅ | ✅ | ❌ | ✅ |
| diagnostico | ✅ | ✅ | ❌ | ❌ |
| procedimento | ✅ | ✅ | ❌ | ✅ |
| retorno | ✅ | ✅ | ✅ | ❌ |
