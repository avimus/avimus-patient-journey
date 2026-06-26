import { describe, it, expect } from 'vitest'
import { getUnlockedSteps } from '../src/get-unlocked-steps'
import type { ProtocolSnapshot, JourneyStepState } from '../src/types'

const protocol: ProtocolSnapshot = {
  id: 'proto-1',
  name: 'Test Protocol',
  steps: [
    { id: 's1', name: 'Step 1', type: 'consulta', orderIndex: 1, prerequisiteStepIds: [], branchConditions: {}, dueDays: null },
    { id: 's2', name: 'Step 2', type: 'exame', orderIndex: 2, prerequisiteStepIds: ['s1'], branchConditions: {}, dueDays: null },
    { id: 's3', name: 'Step 3', type: 'retorno', orderIndex: 3, prerequisiteStepIds: ['s1', 's2'], branchConditions: {}, dueDays: null },
  ],
}

describe('getUnlockedSteps', () => {
  it('returns step with no prerequisites as unlockable when bloqueado', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'bloqueado' },
      { protocolStepId: 's2', status: 'bloqueado' },
      { protocolStepId: 's3', status: 'bloqueado' },
    ]

    const unlocked = getUnlockedSteps(protocol, steps)
    expect(unlocked).toHaveLength(1)
    expect(unlocked[0].id).toBe('s1')
  })

  it('unlocks step when its single prerequisite is complete', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'concluido' },
      { protocolStepId: 's2', status: 'bloqueado' },
      { protocolStepId: 's3', status: 'bloqueado' },
    ]

    const unlocked = getUnlockedSteps(protocol, steps)
    expect(unlocked).toHaveLength(1)
    expect(unlocked[0].id).toBe('s2')
  })

  it('unlocks step only when all prerequisites are complete', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'concluido' },
      { protocolStepId: 's2', status: 'concluido' },
      { protocolStepId: 's3', status: 'bloqueado' },
    ]

    const unlocked = getUnlockedSteps(protocol, steps)
    expect(unlocked).toHaveLength(1)
    expect(unlocked[0].id).toBe('s3')
  })

  it('does not return ignored steps', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'concluido' },
      { protocolStepId: 's2', status: 'ignorado' },
      { protocolStepId: 's3', status: 'bloqueado' },
    ]

    const unlocked = getUnlockedSteps(protocol, steps)
    expect(unlocked.find(s => s.id === 's2')).toBeUndefined()
  })
})
