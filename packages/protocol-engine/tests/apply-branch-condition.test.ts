import { describe, it, expect } from 'vitest'
import { applyBranchCondition } from '../src/apply-branch-condition'
import type { ProtocolStepDef, ProtocolSnapshot } from '../src/types'

const branchStep: ProtocolStepDef = {
  id: 'diag',
  name: 'Diagnóstico',
  type: 'diagnostico',
  orderIndex: 2,
  prerequisiteStepIds: ['s1'],
  branchConditions: {
    cirurgico: ['s3a', 's4a'],
    conservador: ['s3b'],
  },
  dueDays: null,
}

const protocol: ProtocolSnapshot = {
  id: 'proto-1',
  name: 'Test',
  steps: [
    { id: 's1', name: 'Triagem', type: 'consulta', orderIndex: 1, prerequisiteStepIds: [], branchConditions: {}, dueDays: null },
    branchStep,
    { id: 's3a', name: 'Cirurgia', type: 'procedimento', orderIndex: 3, prerequisiteStepIds: ['diag'], branchConditions: {}, dueDays: null },
    { id: 's4a', name: 'Pós-op', type: 'retorno', orderIndex: 4, prerequisiteStepIds: ['s3a'], branchConditions: {}, dueDays: null },
    { id: 's3b', name: 'Tratamento conservador', type: 'procedimento', orderIndex: 3, prerequisiteStepIds: ['diag'], branchConditions: {}, dueDays: null },
  ],
}

describe('applyBranchCondition', () => {
  it('activates correct branch and marks others as ignored for known result', () => {
    const result = applyBranchCondition(branchStep, 'cirurgico', protocol)
    expect(result.activated.map(s => s.id)).toEqual(['s3a', 's4a'])
    expect(result.ignored.map(s => s.id)).toEqual(['s3b'])
  })

  it('returns empty arrays for unknown result', () => {
    const result = applyBranchCondition(branchStep, 'desconhecido', protocol)
    expect(result.activated).toEqual([])
    expect(result.ignored).toEqual([])
  })

  it('returns empty arrays when step has no branchConditions', () => {
    const noBranchStep: ProtocolStepDef = {
      id: 's1',
      name: 'Triagem',
      type: 'consulta',
      orderIndex: 1,
      prerequisiteStepIds: [],
      branchConditions: {},
      dueDays: null,
    }
    const result = applyBranchCondition(noBranchStep, 'anything', protocol)
    expect(result.activated).toEqual([])
    expect(result.ignored).toEqual([])
  })
})
