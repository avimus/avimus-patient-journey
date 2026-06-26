# API Contract: /api/v1/dashboard

All routes require a valid Supabase JWT with `tenant_id` claim.
Responses typed via `packages/types/src/dashboard.ts`.

---

## GET /api/v1/dashboard/stats

Returns aggregate counts for the authenticated tenant's dashboard.
A journey is "overdue" when its current active step has been in `pendente` or `em_andamento`
status for more days than the step's `dueDays` value. Steps without a `dueDays` value
do not contribute to the overdue count.

### Response 200

```typescript
// packages/types/src/dashboard.ts
export const DashboardStatsSchema = z.object({
  totalPatients: z.number().int(),
  activeJourneys: z.number().int(),     // status = 'ativo'
  overdueJourneys: z.number().int(),    // active journeys where current step exceeded dueDays
  suspendedJourneys: z.number().int(),  // status = 'suspenso'
  completedJourneys: z.number().int(),  // status = 'concluido'
  overdueList: z.array(z.object({
    journeyId: z.string().uuid(),
    patientName: z.string(),
    protocolName: z.string(),
    currentStepName: z.string(),
    daysSinceStepStart: z.number().int(),
    dueDays: z.number().int(),
  })).max(10),  // Top 10 most overdue
})
```

### Response 401
```json
{ "error": "Unauthorized", "code": "MISSING_TOKEN" }
```
