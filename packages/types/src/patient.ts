import { z } from 'zod'
import { JourneyStatusSchema } from './enums'

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
export type Patient = z.infer<typeof PatientSchema>

export const CreatePatientSchema = z.object({
  fullName: z.string().min(2).max(200),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/),
  birthDate: z.string().datetime(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().email().optional(),
  lgpdLegalBasis: z.string().default('tratamento de saúde — art. 11, II, f, LGPD'),
})
export type CreatePatient = z.infer<typeof CreatePatientSchema>

export const PatientListItemSchema = z.object({
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
})
export type PatientListItem = z.infer<typeof PatientListItemSchema>

export const PatientListResponseSchema = z.object({
  data: z.array(PatientListItemSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
})
export type PatientListResponse = z.infer<typeof PatientListResponseSchema>

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
export type PatientDetail = z.infer<typeof PatientDetailSchema>
