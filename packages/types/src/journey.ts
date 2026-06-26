import { z } from 'zod'
import { JourneyStatusSchema, StepStatusSchema, StepTypeSchema } from './enums'
import { ProtocolSnapshotSchema } from './snapshot'

export const JourneyStepSchema = z.object({
  id: z.string().uuid(),
  protocolStepId: z.string(),
  status: StepStatusSchema,
  executedAt: z.string().datetime().nullable(),
  executedByName: z.string().nullable(),
  result: z.string().nullable(),
  notes: z.string().nullable(),
  stepName: z.string(),
  stepType: StepTypeSchema,
  stepOrderIndex: z.number().int(),
  prerequisiteStepIds: z.array(z.string()),
  branchConditions: z.record(z.string(), z.array(z.string())),
  dueDays: z.number().int().nullable(),
  isOverdue: z.boolean(),
})
export type JourneyStep = z.infer<typeof JourneyStepSchema>

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
  progress: z.number().min(0).max(100),
  nextStepId: z.string().nullable(),
  steps: z.array(JourneyStepSchema),
})
export type JourneyDetail = z.infer<typeof JourneyDetailSchema>

export const CreateJourneySchema = z.object({
  patientId: z.string().uuid(),
  protocolId: z.string().uuid(),
})
export type CreateJourney = z.infer<typeof CreateJourneySchema>

export const UpdateJourneyStatusSchema = z.object({
  status: z.enum(['ativo', 'suspenso', 'cancelado']),
})
export type UpdateJourneyStatus = z.infer<typeof UpdateJourneyStatusSchema>

export const JourneyStatusResponseSchema = z.object({
  id: z.string().uuid(),
  status: JourneyStatusSchema,
  updatedAt: z.string().datetime(),
})
export type JourneyStatusResponse = z.infer<typeof JourneyStatusResponseSchema>

export const JourneyListItemSchema = z.object({
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
})

export const JourneyListResponseSchema = z.object({
  data: z.array(JourneyListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
})
export type JourneyListResponse = z.infer<typeof JourneyListResponseSchema>
