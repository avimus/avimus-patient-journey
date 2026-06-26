'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { formatDateTime } from '@/lib/utils'
import type { JourneyStep } from '@avimus/types'
import { BranchIndicator } from './branch-indicator'
import {
  X,
  CheckCircle2,
  Clock,
  Lock,
  XCircle,
  Circle,
  AlertTriangle,
} from 'lucide-react'

const STATUS_ICON = {
  bloqueado: Lock,
  pendente: Circle,
  em_andamento: Clock,
  concluido: CheckCircle2,
  ignorado: XCircle,
} as const

interface StepDrawerProps {
  step: JourneyStep | null
  open: boolean
  onClose: () => void
  onComplete: (stepId: string, data: { result?: string; notes?: string }) => Promise<void>
  isSubmitting: boolean
}

export function StepDrawer({ step, open, onClose, onComplete, isSubmitting }: StepDrawerProps) {
  const [result, setResult] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!step) return null

  const hasBranch = Object.keys(step.branchConditions).length > 0
  const canComplete = step.status === 'pendente' || step.status === 'em_andamento'
  const branchOptions = hasBranch ? Object.keys(step.branchConditions) : []
  const StatusIcon = STATUS_ICON[step.status]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (hasBranch && !result) {
      setError('Selecione um resultado para a etapa de decisão.')
      return
    }

    try {
      await onComplete(step!.id, {
        result: result || undefined,
        notes: notes || undefined,
      })
      setResult('')
      setNotes('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao concluir etapa')
    }
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={onClose}
        />
      )}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-background shadow-xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            <h2 className="text-lg font-semibold">Detalhes da Etapa</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h3 className="text-xl font-semibold">{step.stepName}</h3>
            <p className="text-sm text-muted-foreground mt-1 capitalize">
              Tipo: {step.stepType}
            </p>
          </div>

          {step.isOverdue && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Etapa atrasada {step.dueDays ? `(prazo: ${step.dueDays} dias)` : ''}
            </div>
          )}

          {step.executedAt && (
            <div className="space-y-1 text-sm">
              <div><span className="text-muted-foreground">Executado em:</span> {formatDateTime(step.executedAt)}</div>
              {step.executedByName && (
                <div><span className="text-muted-foreground">Por:</span> {step.executedByName}</div>
              )}
              {step.result && (
                <div><span className="text-muted-foreground">Resultado:</span> {step.result}</div>
              )}
              {step.notes && (
                <div><span className="text-muted-foreground">Observações:</span> {step.notes}</div>
              )}
            </div>
          )}

          {hasBranch && (
            <BranchIndicator
              branchConditions={step.branchConditions}
              result={step.result}
            />
          )}

          {step.prerequisiteStepIds.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Pré-requisitos: {step.prerequisiteStepIds.length} etapa(s)
            </div>
          )}

          {canComplete && (
            <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-sm">Concluir Etapa</h4>

              {hasBranch ? (
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Resultado da decisão <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {branchOptions.map(opt => (
                      <label
                        key={opt}
                        className={cn(
                          'flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors',
                          result === opt ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                        )}
                      >
                        <input
                          type="radio"
                          name="branch-result"
                          value={opt}
                          checked={result === opt}
                          onChange={() => setResult(opt)}
                          className="h-4 w-4 text-primary"
                        />
                        <span className="text-sm font-medium">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="result" className="block text-sm font-medium mb-1.5">
                    Resultado (opcional)
                  </label>
                  <input
                    id="result"
                    type="text"
                    value={result}
                    onChange={e => setResult(e.target.value)}
                    placeholder="Ex: Normal, Alterado..."
                    className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    maxLength={1000}
                  />
                </div>
              )}

              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
                  Observações (opcional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Anotações sobre a etapa..."
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  maxLength={2000}
                />
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className={cn(
                  'w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors',
                  isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/90',
                )}
              >
                {isSubmitting ? 'Concluindo...' : 'Concluir Etapa'}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
