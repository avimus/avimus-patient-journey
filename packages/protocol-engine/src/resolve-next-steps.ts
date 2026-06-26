import type { ProtocolSnapshot, JourneyStepState, ProtocolResolution } from './types'

export function resolveNextSteps(
  protocol: ProtocolSnapshot,
  steps: JourneyStepState[]
): ProtocolResolution {
  const statusMap = new Map(steps.map(s => [s.protocolStepId, s]))
  const sortedDefs = [...protocol.steps].sort((a, b) => a.orderIndex - b.orderIndex)

  const unlockedStepIds: string[] = []
  const ignoredStepIds: string[] = []

  for (const stepDef of sortedDefs) {
    const state = statusMap.get(stepDef.id)
    if (!state) continue

    if (state.status === 'ignorado') {
      ignoredStepIds.push(stepDef.id)
      continue
    }

    if (state.status !== 'bloqueado') continue

    const prerequisitesMet = stepDef.prerequisiteStepIds.every(preId => {
      const preState = statusMap.get(preId)
      return preState?.status === 'concluido'
    })

    if (prerequisitesMet) {
      unlockedStepIds.push(stepDef.id)
    }
  }

  let nextStepId: string | null = null
  for (const stepDef of sortedDefs) {
    const state = statusMap.get(stepDef.id)
    if (!state) continue

    const effectiveStatus = unlockedStepIds.includes(stepDef.id) ? 'pendente' : state.status
    if (effectiveStatus === 'pendente' || effectiveStatus === 'em_andamento') {
      nextStepId = stepDef.id
      break
    }
  }

  return { unlockedStepIds, ignoredStepIds, nextStepId }
}
