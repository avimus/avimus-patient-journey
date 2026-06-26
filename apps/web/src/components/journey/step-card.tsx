'use client'

import { cn } from '@/lib/utils'
import type { JourneyStep } from '@avimus/types'
import {
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  XCircle,
  AlertTriangle,
  Stethoscope,
  FlaskConical,
  ClipboardList,
  Syringe,
  CalendarCheck,
  GitBranch,
} from 'lucide-react'

const STATUS_CONFIG = {
  bloqueado: { icon: Lock, color: 'text-muted-foreground', bg: 'bg-muted', label: 'Bloqueado' },
  pendente: { icon: Circle, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pendente' },
  em_andamento: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Em andamento' },
  concluido: { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50', label: 'Concluído' },
  ignorado: { icon: XCircle, color: 'text-gray-400', bg: 'bg-gray-50', label: 'Ignorado' },
} as const

const STEP_TYPE_ICON = {
  consulta: Stethoscope,
  exame: FlaskConical,
  procedimento: Syringe,
  retorno: CalendarCheck,
  diagnostico: GitBranch,
  avaliacao: ClipboardList,
} as const

interface StepCardProps {
  step: JourneyStep
  isNext: boolean
  onClick: () => void
}

export function StepCard({ step, isNext, onClick }: StepCardProps) {
  const config = STATUS_CONFIG[step.status]
  const StatusIcon = config.icon
  const TypeIcon = STEP_TYPE_ICON[step.stepType as keyof typeof STEP_TYPE_ICON] ?? ClipboardList
  const clickable = step.status === 'pendente' || step.status === 'em_andamento'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable && step.status !== 'concluido'}
      className={cn(
        'w-full rounded-lg border p-4 text-left transition-all',
        clickable && 'cursor-pointer hover:shadow-md hover:border-primary/50',
        step.status === 'concluido' && 'cursor-pointer hover:bg-green-50/50',
        isNext && 'ring-2 ring-primary ring-offset-2',
        step.status === 'ignorado' && 'opacity-50',
        step.status === 'bloqueado' && 'opacity-60 cursor-not-allowed',
        config.bg,
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5 shrink-0', config.color)}>
          <StatusIcon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="font-medium text-sm truncate">{step.stepName}</h3>
            {isNext && (
              <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                PRÓXIMA
              </span>
            )}
          </div>

          <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className={config.color}>{config.label}</span>
            {step.executedByName && (
              <span>por {step.executedByName}</span>
            )}
            {step.executedAt && (
              <span>{new Date(step.executedAt).toLocaleDateString('pt-BR')}</span>
            )}
          </div>

          {step.isOverdue && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-red-600">
              <AlertTriangle className="h-3 w-3" />
              <span>Atrasada {step.dueDays ? `(prazo: ${step.dueDays}d)` : ''}</span>
            </div>
          )}

          {step.result && (
            <div className="mt-1.5 text-xs text-muted-foreground">
              Resultado: <span className="font-medium">{step.result}</span>
            </div>
          )}

          {Object.keys(step.branchConditions).length > 0 && step.status !== 'concluido' && step.status !== 'ignorado' && (
            <div className="mt-1.5 flex items-center gap-1 text-xs text-purple-600">
              <GitBranch className="h-3 w-3" />
              <span>Etapa de decisão</span>
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
