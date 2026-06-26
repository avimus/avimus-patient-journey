import { z } from 'zod'
import { JourneyStatusSchema } from './enums'

export const CompleteStepSchema = z.object({
  result: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
})
export type CompleteStep = z.infer<typeof CompleteStepSchema>

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
  nextStepId: z.string().nullable(),
  progress: z.number().min(0).max(100),
  journeyStatus: JourneyStatusSchema,
})
export type CompleteStepResponse = z.infer<typeof CompleteStepResponseSchema>
