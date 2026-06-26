import { z } from 'zod'
import { StepTypeSchema } from './enums'

export const ProtocolStepDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: StepTypeSchema,
  orderIndex: z.number().int(),
  prerequisiteStepIds: z.array(z.string()),
  branchConditions: z.record(z.string(), z.array(z.string())),
  dueDays: z.number().int().nullable(),
})
export type ProtocolStepDef = z.infer<typeof ProtocolStepDefSchema>

export const ProtocolSnapshotSchema = z.object({
  id: z.string(),
  name: z.string(),
  steps: z.array(ProtocolStepDefSchema),
})
export type ProtocolSnapshot = z.infer<typeof ProtocolSnapshotSchema>
