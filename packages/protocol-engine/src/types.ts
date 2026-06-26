export type StepStatus = 'bloqueado' | 'pendente' | 'em_andamento' | 'concluido' | 'ignorado'
export type StepType = 'consulta' | 'exame' | 'diagnostico' | 'procedimento' | 'retorno'

export type BranchConditions = Record<string, string[]>

export interface ProtocolStepDef {
  id: string
  name: string
  type: StepType
  orderIndex: number
  prerequisiteStepIds: string[]
  branchConditions: BranchConditions
  dueDays: number | null
}

export interface ProtocolSnapshot {
  id: string
  name: string
  steps: ProtocolStepDef[]
}

export interface JourneyStepState {
  protocolStepId: string
  status: StepStatus
  result?: string | null
}

export interface ProtocolResolution {
  unlockedStepIds: string[]
  ignoredStepIds: string[]
  nextStepId: string | null
}

export interface BranchResult {
  activated: ProtocolStepDef[]
  ignored: ProtocolStepDef[]
}
