'use client'

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  value: number
  className?: string
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            clamped === 100 ? 'bg-green-500' : clamped >= 50 ? 'bg-blue-500' : 'bg-amber-500',
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-sm font-medium tabular-nums text-muted-foreground">
        {Math.round(clamped)}%
      </span>
    </div>
  )
}
