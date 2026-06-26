'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Trash2, AlertTriangle } from 'lucide-react'

const STEP_TYPES = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'exame', label: 'Exame' },
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'procedimento', label: 'Procedimento' },
  { value: 'retorno', label: 'Retorno' },
] as const

interface StepInput {
  name: string
  type: string
  orderIndex: number
  prerequisiteStepIds: string[]
  branchConditions: Record<string, string[]>
  dueDays: number | undefined
}

interface ProtocolStepEditorProps {
  initialSteps?: StepInput[]
  readOnly?: boolean
  activeJourneyCount?: number
  onSave: (steps: StepInput[]) => void
  isSaving: boolean
}

export function ProtocolStepEditor({
  initialSteps = [],
  readOnly = false,
  activeJourneyCount = 0,
  onSave,
  isSaving,
}: ProtocolStepEditorProps) {
  const [steps, setSteps] = useState<StepInput[]>(
    initialSteps.length > 0
      ? initialSteps
      : [{ name: '', type: 'consulta', orderIndex: 1, prerequisiteStepIds: [], branchConditions: {}, dueDays: undefined }],
  )

  function addStep() {
    setSteps(prev => [
      ...prev,
      {
        name: '',
        type: 'consulta',
        orderIndex: prev.length + 1,
        prerequisiteStepIds: [],
        branchConditions: {},
        dueDays: undefined,
      },
    ])
  }

  function removeStep(index: number) {
    setSteps(prev => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((s, i) => ({ ...s, orderIndex: i + 1 }))
    })
  }

  function updateStep(index: number, partial: Partial<StepInput>) {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, ...partial } : s))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(steps)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {readOnly && activeJourneyCount > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Protocolo possui {activeJourneyCount} jornada(s) ativa(s). Edição bloqueada.
        </div>
      )}

      <div className="space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-muted-foreground">Etapa {step.orderIndex}</span>
              {!readOnly && steps.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeStep(i)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={step.name}
                  onChange={e => updateStep(i, { name: e.target.value })}
                  disabled={readOnly}
                  className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Tipo</label>
                <select
                  value={step.type}
                  onChange={e => updateStep(i, { type: e.target.value })}
                  disabled={readOnly}
                  className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                >
                  {STEP_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium mb-1">Prazo (dias, opcional)</label>
                <input
                  type="number"
                  value={step.dueDays ?? ''}
                  onChange={e => updateStep(i, { dueDays: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                  disabled={readOnly}
                  min={1}
                  className="w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Pré-requisitos</label>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: i }, (_, j) => j + 1).map(idx => {
                    const isSelected = step.prerequisiteStepIds.includes(String(idx))
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={readOnly}
                        onClick={() => {
                          const updated = isSelected
                            ? step.prerequisiteStepIds.filter(id => id !== String(idx))
                            : [...step.prerequisiteStepIds, String(idx)]
                          updateStep(i, { prerequisiteStepIds: updated })
                        }}
                        className={cn(
                          'rounded px-2 py-0.5 text-xs font-medium transition-colors',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80',
                          readOnly && 'cursor-default',
                        )}
                      >
                        #{idx}
                      </button>
                    )
                  })}
                  {i === 0 && <span className="text-xs text-muted-foreground">—</span>}
                </div>
              </div>
            </div>

            {step.type === 'diagnostico' && (
              <div>
                <label className="block text-xs font-medium mb-1">Condições de ramificação</label>
                <p className="text-xs text-muted-foreground mb-2">
                  Formato: resultado → etapas ativadas (números separados por vírgula)
                </p>
                {Object.entries(step.branchConditions).map(([key, vals], bi) => (
                  <div key={bi} className="flex items-center gap-2 mb-1">
                    <input
                      type="text"
                      value={key}
                      disabled={readOnly}
                      onChange={e => {
                        const newConditions = { ...step.branchConditions }
                        delete newConditions[key]
                        newConditions[e.target.value] = vals
                        updateStep(i, { branchConditions: newConditions })
                      }}
                      placeholder="Resultado"
                      className="w-32 rounded-md border px-2 py-1 text-xs disabled:opacity-60"
                    />
                    <span className="text-xs">&rarr;</span>
                    <input
                      type="text"
                      value={vals.join(',')}
                      disabled={readOnly}
                      onChange={e => {
                        const newConditions = { ...step.branchConditions }
                        newConditions[key] = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        updateStep(i, { branchConditions: newConditions })
                      }}
                      placeholder="1,2,3"
                      className="flex-1 rounded-md border px-2 py-1 text-xs disabled:opacity-60"
                    />
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={() => {
                          const newConditions = { ...step.branchConditions }
                          delete newConditions[key]
                          updateStep(i, { branchConditions: newConditions })
                        }}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => {
                      const newConditions = { ...step.branchConditions, '': [] }
                      updateStep(i, { branchConditions: newConditions })
                    }}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    + Adicionar condição
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {!readOnly && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={addStep}
            className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <Plus className="h-4 w-4" />
            Adicionar Etapa
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className={cn(
              'ml-auto rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-colors',
              isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90',
            )}
          >
            {isSaving ? 'Salvando...' : 'Salvar Protocolo'}
          </button>
        </div>
      )}
    </form>
  )
}
