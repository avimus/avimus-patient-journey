import { z } from 'zod'
import { StepTypeSchema } from './enums'

export const ProtocolStepSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: StepTypeSchema,
  orderIndex: z.number().int(),
  prerequisiteStepIds: z.array(z.string()),
  branchConditions: z.record(z.string(), z.array(z.string())),
  dueDays: z.number().int().nullable(),
})
export type ProtocolStep = z.infer<typeof ProtocolStepSchema>

export const CreateProtocolStepSchema = z.object({
  name: z.string().min(1).max(200),
  type: StepTypeSchema,
  orderIndex: z.number().int().min(1),
  prerequisiteStepIds: z.array(z.string()).default([]),
  branchConditions: z.record(z.string(), z.array(z.string())).default({}),
  dueDays: z.number().int().positive().optional(),
})

export const CreateProtocolSchema = z.object({
  name: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  steps: z.array(CreateProtocolStepSchema).min(1),
})
export type CreateProtocol = z.infer<typeof CreateProtocolSchema>

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
export type ProtocolDetail = z.infer<typeof ProtocolDetailSchema>

export const ProtocolListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  isActive: z.boolean(),
  stepCount: z.number().int(),
  activeJourneyCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})
export type ProtocolListItem = z.infer<typeof ProtocolListItemSchema>

export const ProtocolListResponseSchema = z.object({
  data: z.array(ProtocolListItemSchema),
})
export type ProtocolListResponse = z.infer<typeof ProtocolListResponseSchema>
