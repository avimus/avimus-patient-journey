'use client'

import { cn } from '@/lib/utils'
import { GitBranch, ArrowRight } from 'lucide-react'

interface BranchIndicatorProps {
  branchConditions: Record<string, string[]>
  result: string | null
  className?: string
}

export function BranchIndicator({ branchConditions, result, className }: BranchIndicatorProps) {
  const entries = Object.entries(branchConditions)
  if (entries.length === 0) return null

  return (
    <div className={cn('rounded-lg border border-purple-200 bg-purple-50/50 p-3', className)}>
      <div className="flex items-center gap-2 text-sm font-medium text-purple-700 mb-2">
        <GitBranch className="h-4 w-4" />
        Ramificação
      </div>
      <div className="space-y-1.5">
        {entries.map(([conditionResult, stepIds]) => {
          const isActive = result === conditionResult
          return (
            <div
              key={conditionResult}
              className={cn(
                'flex items-center gap-2 rounded px-2 py-1 text-xs',
                isActive ? 'bg-purple-100 text-purple-800 font-medium' : 'text-purple-600',
              )}
            >
              <ArrowRight className="h-3 w-3 shrink-0" />
              <span className="font-mono">{conditionResult}</span>
              <span className="text-purple-400">&rarr;</span>
              <span>{stepIds.length} etapa(s)</span>
              {isActive && (
                <span className="ml-auto rounded-full bg-purple-200 px-1.5 py-0.5 text-[10px] font-semibold">
                  ATIVO
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
