import { z } from 'zod'

export const StepStatusSchema = z.enum([
  'bloqueado',
  'pendente',
  'em_andamento',
  'concluido',
  'ignorado',
])
export type StepStatus = z.infer<typeof StepStatusSchema>

export const JourneyStatusSchema = z.enum([
  'ativo',
  'concluido',
  'suspenso',
  'cancelado',
])
export type JourneyStatus = z.infer<typeof JourneyStatusSchema>

export const UserRoleSchema = z.enum([
  'admin',
  'medico',
  'recepcionista',
  'enfermeiro',
])
export type UserRole = z.infer<typeof UserRoleSchema>

export const StepTypeSchema = z.enum([
  'consulta',
  'exame',
  'diagnostico',
  'procedimento',
  'retorno',
])
export type StepType = z.infer<typeof StepTypeSchema>

export const ROLE_STEP_PERMISSIONS: Record<string, StepType[]> = {
  admin: ['consulta', 'exame', 'diagnostico', 'procedimento', 'retorno'],
  medico: ['consulta', 'exame', 'diagnostico', 'procedimento', 'retorno'],
  recepcionista: ['consulta', 'retorno'],
  enfermeiro: ['exame', 'procedimento'],
}
