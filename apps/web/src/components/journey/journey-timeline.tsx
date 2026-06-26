'use client'

import { cn } from '@/lib/utils'
import type { JourneyStep } from '@avimus/types'
import { StepCard } from './step-card'

interface JourneyTimelineProps {
  steps: JourneyStep[]
  nextStepId: string | null
  onStepClick: (step: JourneyStep) => void
}

export function JourneyTimeline({ steps, nextStepId, onStepClick }: JourneyTimelineProps) {
  return (
    <div className="relative space-y-3">
      <div className="absolute left-[19px] top-6 bottom-6 w-px bg-border" />

      {steps.map((step, i) => {
        const isNext = step.protocolStepId === nextStepId
        const isLast = i === steps.length - 1

        return (
          <div key={step.id} className="relative pl-10">
            <div
              className={cn(
                'absolute left-[15px] top-5 h-2.5 w-2.5 rounded-full border-2 z-10',
                step.status === 'concluido' && 'bg-green-500 border-green-500',
                step.status === 'pendente' && 'bg-amber-400 border-amber-400',
                step.status === 'em_andamento' && 'bg-blue-500 border-blue-500',
                step.status === 'bloqueado' && 'bg-muted border-muted-foreground/30',
                step.status === 'ignorado' && 'bg-gray-300 border-gray-300',
              )}
            />

            <StepCard
              step={step}
              isNext={isNext}
              onClick={() => onStepClick(step)}
            />

            {!isLast && step.status === 'concluido' && (
              <div className="absolute left-[15px] top-[calc(100%+2px)] h-3 w-px bg-green-500 z-10" />
            )}
          </div>
        )
      })}
    </div>
  )
}
