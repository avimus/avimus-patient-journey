import type { JourneyStepState } from './types'

export function calculateProgress(steps: JourneyStepState[]): number {
  const relevant = steps.filter(s => s.status !== 'ignorado')
  if (relevant.length === 0) return 100

  const completed = relevant.filter(s => s.status === 'concluido').length
  return Math.round((completed / relevant.length) * 100)
}
