'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/auth'
import { getPatient } from '@/lib/api-client'
import type { PatientDetail } from '@avimus/types'
import { ProgressBar } from '@/components/journey/progress-bar'
import { formatDate, formatCPF } from '@/lib/utils'
import { ArrowLeft, User, Phone, Mail, Shield } from 'lucide-react'

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

export default function PatientDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const data = await getPatient(session.access_token, params.id)
        setPatient(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar paciente')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error || !patient) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{error ?? 'Paciente não encontrado'}</p>
        <button onClick={() => router.back()} className="text-sm text-primary hover:underline">
          Voltar
        </button>
      </div>
    )
  }

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
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{patient.fullName}</h1>
            <p className="text-sm text-muted-foreground tabular-nums">
              CPF: {formatCPF(patient.cpf)} &middot; Nascimento: {formatDate(patient.birthDate)}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          {patient.contactPhone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-4 w-4" />
              {patient.contactPhone}
            </div>
          )}
          {patient.contactEmail && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />
              {patient.contactEmail}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Base legal LGPD: {patient.lgpdLegalBasis}</span>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-4">Jornadas</h2>
        {patient.journeys.length === 0 ? (
          <div className="rounded-lg border p-6 text-center text-muted-foreground">
            Nenhuma jornada registrada
          </div>
        ) : (
          <div className="space-y-3">
            {patient.journeys.map(j => (
              <button
                key={j.id}
                type="button"
                onClick={() => router.push(`/journeys/${j.id}`)}
                className="w-full rounded-lg border bg-card p-4 text-left hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{j.protocolName}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[j.status] ?? ''}`}>
                    {STATUS_LABELS[j.status] ?? j.status}
                  </span>
                </div>
                <ProgressBar value={j.progress} className="mt-3" />
                <div className="mt-2 text-xs text-muted-foreground">
                  Início: {formatDate(j.startedAt)}
                  {j.completedAt && ` · Concluída: ${formatDate(j.completedAt)}`}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
