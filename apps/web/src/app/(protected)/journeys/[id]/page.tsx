'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/auth'
import { getJourney, completeStep as completeStepApi } from '@/lib/api-client'
import type { JourneyDetail, JourneyStep } from '@avimus/types'
import { ProgressBar } from '@/components/journey/progress-bar'
import { JourneyTimeline } from '@/components/journey/journey-timeline'
import { StepDrawer } from '@/components/journey/step-drawer'
import { formatDate } from '@/lib/utils'
import { ArrowLeft, User, FileText, Calendar, Activity } from 'lucide-react'

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

export default function JourneyDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [journey, setJourney] = useState<JourneyDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedStep, setSelectedStep] = useState<JourneyStep | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchJourney = useCallback(async () => {
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }
      const data = await getJourney(session.access_token, params.id)
      setJourney(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar jornada')
    } finally {
      setLoading(false)
    }
  }, [params.id, router])

  useEffect(() => {
    fetchJourney()
  }, [fetchJourney])

  function handleStepClick(step: JourneyStep) {
    setSelectedStep(step)
    setDrawerOpen(true)
  }

  async function handleCompleteStep(stepId: string, data: { result?: string; notes?: string }) {
    setIsSubmitting(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      await completeStepApi(session.access_token, stepId, data)
      setDrawerOpen(false)
      setSelectedStep(null)
      await fetchJourney()
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !journey) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{error ?? 'Jornada não encontrada'}</p>
        <button
          onClick={() => router.back()}
          className="text-sm text-primary hover:underline"
        >
          Voltar
        </button>
      </div>
    )
  }

  const completedCount = journey.steps.filter(s => s.status === 'concluido').length
  const totalRelevant = journey.steps.filter(s => s.status !== 'ignorado').length

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar
      </button>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{journey.protocolName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {journey.patientName}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                Início: {formatDate(journey.startedAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Activity className="h-4 w-4" />
                {completedCount}/{totalRelevant} etapas
              </span>
            </div>
          </div>

          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[journey.status] ?? ''}`}>
            {STATUS_LABELS[journey.status] ?? journey.status}
          </span>
        </div>

        <ProgressBar value={journey.progress} />

        {journey.completedAt && (
          <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">
            <FileText className="h-4 w-4" />
            Jornada concluída em {formatDate(journey.completedAt)}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Etapas do Protocolo</h2>
        <JourneyTimeline
          steps={journey.steps}
          nextStepId={journey.nextStepId}
          onStepClick={handleStepClick}
        />
      </div>

      <StepDrawer
        step={selectedStep}
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setSelectedStep(null) }}
        onComplete={handleCompleteStep}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
