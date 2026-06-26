'use client'

import { cn } from '@/lib/utils'

interface MetricCardProps {
  label: string
  value: number
  subtitle?: string
  variant?: 'default' | 'warning' | 'success'
}

const VARIANTS = {
  default: 'border-blue-200 bg-blue-50/50',
  warning: 'border-amber-200 bg-amber-50/50',
  success: 'border-green-200 bg-green-50/50',
} as const

const VALUE_COLORS = {
  default: 'text-blue-700',
  warning: 'text-amber-700',
  success: 'text-green-700',
} as const

export function MetricCard({ label, value, subtitle, variant = 'default' }: MetricCardProps) {
  return (
    <div className={cn('rounded-lg border p-5', VARIANTS[variant])}>
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold tabular-nums', VALUE_COLORS[variant])}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </div>
  )
}
