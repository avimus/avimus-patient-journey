import type { ProtocolStepDef, ProtocolSnapshot, BranchResult } from './types'

export function applyBranchCondition(
  step: ProtocolStepDef,
  result: string,
  protocol: ProtocolSnapshot
): BranchResult {
  if (!step.branchConditions || Object.keys(step.branchConditions).length === 0) {
    return { activated: [], ignored: [] }
  }

  const activatedIds = step.branchConditions[result]
  if (!activatedIds) {
    return { activated: [], ignored: [] }
  }

  const activatedIdSet = new Set(activatedIds)

  const allBranchStepIds = new Set<string>()
  for (const ids of Object.values(step.branchConditions)) {
    for (const id of ids) {
      allBranchStepIds.add(id)
    }
  }

  const stepMap = new Map(protocol.steps.map(s => [s.id, s]))

  const activated: ProtocolStepDef[] = []
  const ignored: ProtocolStepDef[] = []

  for (const stepId of allBranchStepIds) {
    const def = stepMap.get(stepId)
    if (!def) continue

    if (activatedIdSet.has(stepId)) {
      activated.push(def)
    } else {
      ignored.push(def)
    }
  }

  return { activated, ignored }
}
