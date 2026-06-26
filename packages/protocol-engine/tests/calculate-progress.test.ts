import { describe, it, expect } from 'vitest'
import { calculateProgress } from '../src/calculate-progress'
import type { JourneyStepState } from '../src/types'

describe('calculateProgress', () => {
  it('returns 0% when no steps are complete', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'pendente' },
      { protocolStepId: 's2', status: 'bloqueado' },
      { protocolStepId: 's3', status: 'bloqueado' },
      { protocolStepId: 's4', status: 'bloqueado' },
      { protocolStepId: 's5', status: 'bloqueado' },
    ]
    expect(calculateProgress(steps)).toBe(0)
  })

  it('returns 20% when 1 of 5 steps is complete', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'concluido' },
      { protocolStepId: 's2', status: 'pendente' },
      { protocolStepId: 's3', status: 'bloqueado' },
      { protocolStepId: 's4', status: 'bloqueado' },
      { protocolStepId: 's5', status: 'bloqueado' },
    ]
    expect(calculateProgress(steps)).toBe(20)
  })

  it('excludes ignored steps from calculation (1 of 3 relevant = 33%)', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'concluido' },
      { protocolStepId: 's2', status: 'pendente' },
      { protocolStepId: 's3', status: 'bloqueado' },
      { protocolStepId: 's4', status: 'ignorado' },
      { protocolStepId: 's5', status: 'ignorado' },
    ]
    expect(calculateProgress(steps)).toBe(33)
  })

  it('returns 100% when all relevant steps are complete', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'concluido' },
      { protocolStepId: 's2', status: 'concluido' },
      { protocolStepId: 's3', status: 'concluido' },
    ]
    expect(calculateProgress(steps)).toBe(100)
  })

  // When all steps are ignored, there are no relevant steps — return 100% (journey complete by definition)
  it('returns 100% when all steps are ignored', () => {
    const steps: JourneyStepState[] = [
      { protocolStepId: 's1', status: 'ignorado' },
      { protocolStepId: 's2', status: 'ignorado' },
    ]
    expect(calculateProgress(steps)).toBe(100)
  })
})
