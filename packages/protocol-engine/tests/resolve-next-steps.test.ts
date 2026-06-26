import { describe, it, expect } from 'vitest'
import { resolveNextSteps } from '../src/resolve-next-steps'
import type { ProtocolSnapshot, JourneyStepState } from '../src/types'

const linearProtocol: ProtocolSnapshot = {
  id: 'proto-1',
  name: 'Linear Protocol',
  steps: [
    { id: 's1', name: 'Step 1', type: 'consulta', orderIndex: 1, prerequisiteStepIds: [], branchConditions: {}, dueDays: null },
    { id: 's2', name: 'Step 2', type: 'exame', orderIndex: 2, prerequisiteStepIds: ['s1'], branchConditions: {}, dueDays: null },
    { id: 's3', name: 'Step 3', type: 'retorno', orderIndex: 3, prerequisiteStepIds: ['s2'], branchConditions: {}, dueDays: null },
  ],
}

const branchedProtocol: ProtocolSnapshot = {
  id: 'proto-2',
  name: 'Branched Protocol',
  steps: [
    { id: 's1', name: 'Triagem', type: 'consulta', orderIndex: 1, prerequisiteStepIds: [], branchConditions: {}, dueDays: null },
    { id: 's2', name: 'Diagnóstico', type: 'diagnostico', orderIndex: 2, prerequisiteStepIds: ['s1'], branchConditions: { cirurgico: ['s3a', 's4a'], conservador: ['s3b'] }, dueDays: null },
    { id: 's3a', name: 'Cirurgia', type: 'procedimento', orderIndex: 3, prerequisiteStepIds: ['s2'], branchConditions: {}, dueDays: null },
    { id: 's4a', name: 'Pós-op', type: 'retorno', orderIndex: 4, prerequisiteStepIds: ['s3a'], branchConditions: {}, dueDays: null },
    { id: 's3b', name: 'Tratamento', type: 'procedimento', orderIndex: 3, prerequisiteStepIds: ['s2'], branchConditions: {}, dueDays: null },
  ],
}

describe('resolveNextSteps', () => {
  it('unlocks step 2 after step 1 is complete in linear protocol', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'concluido' },
      { protocolStepId: 's2', status: 'bloqueado' },
      { protocolStepId: 's3', status: 'bloqueado' },
    ]

    const result = resolveNextSteps(linearProtocol, steps)
    expect(result.unlockedStepIds).toContain('s2')
    expect(result.unlockedStepIds).not.toContain('s3')
    expect(result.nextStepId).toBe('s2')
  })

  it('does not unlock step with unsatisfied prerequisites', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'pendente' },
      { protocolStepId: 's2', status: 'bloqueado' },
      { protocolStepId: 's3', status: 'bloqueado' },
    ]

    const result = resolveNextSteps(linearProtocol, steps)
    expect(result.unlockedStepIds).toEqual([])
    expect(result.nextStepId).toBe('s1')
  })

  it('returns nextStepId null when all steps are complete', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'concluido' },
      { protocolStepId: 's2', status: 'concluido' },
      { protocolStepId: 's3', status: 'concluido' },
    ]

    const result = resolveNextSteps(linearProtocol, steps)
    expect(result.nextStepId).toBeNull()
  })

  it('reports ignored steps in branched protocol', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'concluido' },
      { protocolStepId: 's2', status: 'concluido', result: 'cirurgico' },
      { protocolStepId: 's3a', status: 'pendente' },
      { protocolStepId: 's4a', status: 'bloqueado' },
      { protocolStepId: 's3b', status: 'ignorado' },
    ]

    const result = resolveNextSteps(branchedProtocol, steps)
    expect(result.ignoredStepIds).toContain('s3b')
    expect(result.nextStepId).toBe('s3a')
  })
})
