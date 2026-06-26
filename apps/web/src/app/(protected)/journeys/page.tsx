'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/auth'
import { listJourneys } from '@/lib/api-client'
import { ProgressBar } from '@/components/journey/progress-bar'
import { formatDate } from '@/lib/utils'
import { AlertTriangle, Search } from 'lucide-react'

interface JourneyListItem {
  id: string
  patientName: string
  protocolName: string
  status: string
  startedAt: string
  completedAt: string | null
  progress: number
  isOverdue: boolean
  currentStepName: string | null
  updatedAt: string
}

const STATUS_LABELS: Record<string, string> = {
  ativo: 'Ativo',
  concluido: 'Concluído',
  suspenso: 'Suspenso',
  cancelado: 'Cancelado',
}

const STATUS_COLORS: Record<string, string> = {
  ativo: 'bg-blue-100 text-blue-800',
  concluido: 'bg-green-100 text-green-800',
  suspenso: 'bg-amber-100 text-amber-800',
  cancelado: 'bg-red-100 text-red-800',
}

export default function JourneysListPage() {
  const router = useRouter()
  const [journeys, setJourneys] = useState<JourneyListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')

  const fetchJourneys = useCallback(async () => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const params: Record<string, string> = {}
      if (statusFilter) params.status = statusFilter
      const result = await listJourneys(session.access_token, params)
      setJourneys(result.data as JourneyListItem[])
    } catch {
      // handled silently
    } finally {
      setLoading(false)
    }
  }, [router, statusFilter])

  useEffect(() => {
    fetchJourneys()
  }, [fetchJourneys])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Jornadas</h1>
      </div>

      <div className="flex gap-2">
        {['', 'ativo', 'concluido', 'suspenso', 'cancelado'].map(s => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setLoading(true) }}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {s ? STATUS_LABELS[s] : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : journeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <Search className="h-8 w-8" />
          <p>Nenhuma jornada encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {journeys.map(j => (
            <button
              key={j.id}
              type="button"
              onClick={() => router.push(`/journeys/${j.id}`)}
              className="w-full rounded-lg border bg-card p-4 text-left hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="font-semibold">{j.patientName}</div>
                  <div className="text-sm text-muted-foreground">{j.protocolName}</div>
                  {j.currentStepName && (
                    <div className="text-xs text-muted-foreground">
                      Etapa atual: {j.currentStepName}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {j.isOverdue && (
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  )}
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[j.status] ?? ''}`}>
                    {STATUS_LABELS[j.status] ?? j.status}
                  </span>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar value={j.progress} />
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                Início: {formatDate(j.startedAt)}
                {j.completedAt && ` · Concluída: ${formatDate(j.completedAt)}`}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
