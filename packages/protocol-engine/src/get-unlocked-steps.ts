import type { ProtocolSnapshot, JourneyStepState, ProtocolStepDef } from './types'

export function getUnlockedSteps(
  protocol: ProtocolSnapshot,
  steps: JourneyStepState[]
): ProtocolStepDef[] {
  const statusMap = new Map(steps.map(s => [s.protocolStepId, s]))
  const unlocked: ProtocolStepDef[] = []

  for (const stepDef of protocol.steps) {
    const state = statusMap.get(stepDef.id)
    if (!state || state.status !== 'bloqueado') continue

    const prerequisitesMet = stepDef.prerequisiteStepIds.length === 0 ||
      stepDef.prerequisiteStepIds.every(preId => {
        const preState = statusMap.get(preId)
        return preState?.status === 'concluido'
      })

    if (prerequisitesMet) {
      unlocked.push(stepDef)
    }
  }

  return unlocked
}
