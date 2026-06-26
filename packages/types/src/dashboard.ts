import { z } from 'zod'

export const OverdueJourneyItemSchema = z.object({
  journeyId: z.string().uuid(),
  patientName: z.string(),
  protocolName: z.string(),
  currentStepName: z.string(),
  daysSinceStepStart: z.number().int(),
  dueDays: z.number().int(),
})

export const DashboardStatsSchema = z.object({
  totalPatients: z.number().int(),
  activeJourneys: z.number().int(),
  overdueJourneys: z.number().int(),
  suspendedJourneys: z.number().int(),
  completedJourneys: z.number().int(),
  overdueList: z.array(OverdueJourneyItemSchema).max(10),
})
export type DashboardStats = z.infer<typeof DashboardStatsSchema>
