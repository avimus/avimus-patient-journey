'use client'

import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

interface OverdueItem {
  journeyId: string
  patientName: string
  protocolName: string
  currentStepName: string
  daysSinceStepStart: number
  dueDays: number
}

interface OverdueListProps {
  items: OverdueItem[]
}

export function OverdueList({ items }: OverdueListProps) {
  const router = useRouter()

  if (items.length === 0) {
    return (
      <div className="rounded-lg border p-6 text-center">
        <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
        <p className="mt-2 text-sm text-muted-foreground">Nenhuma jornada atrasada</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <h3 className="font-semibold text-sm">Jornadas Atrasadas</h3>
        <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          {items.length}
        </span>
      </div>
      <div className="divide-y">
        {items.map(item => {
          const daysOverdue = item.daysSinceStepStart - item.dueDays
          return (
            <button
              key={item.journeyId}
              type="button"
              onClick={() => router.push(`/journeys/${item.journeyId}`)}
              className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.patientName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {item.protocolName} &middot; {item.currentStepName}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                +{daysOverdue}d
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
