'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/auth'
import {
  getProtocol,
  createProtocol as createProtocolApi,
  updateProtocol as updateProtocolApi,
  deleteProtocol as deleteProtocolApi,
} from '@/lib/api-client'
import type { ProtocolDetail } from '@avimus/types'
import { ProtocolStepEditor } from '@/components/protocols/protocol-step-editor'
import { ArrowLeft, Trash2 } from 'lucide-react'

export default function ProtocolDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const isNew = params.id === 'new'

  const [protocol, setProtocol] = useState<ProtocolDetail | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (isNew) return

    async function load() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const data = await getProtocol(session.access_token, params.id)
        setProtocol(data)
        setName(data.name)
        setDescription(data.description ?? '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar protocolo')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, isNew, router])

  async function handleSave(steps: { name: string; type: string; orderIndex: number; prerequisiteStepIds: string[]; branchConditions: Record<string, string[]>; dueDays: number | undefined }[]) {
    setIsSaving(true)
    setError(null)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      const body = {
        name,
        description: description || undefined,
        steps: steps.map(s => ({
          name: s.name,
          type: s.type as 'consulta' | 'exame' | 'diagnostico' | 'procedimento' | 'retorno',
          orderIndex: s.orderIndex,
          prerequisiteStepIds: s.prerequisiteStepIds,
          branchConditions: s.branchConditions,
          dueDays: s.dueDays,
        })),
      }

      if (isNew) {
        await createProtocolApi(session.access_token, body)
        router.push('/protocols')
      } else {
        await updateProtocolApi(session.access_token, params.id, body)
        router.push('/protocols')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar protocolo')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada')

      await deleteProtocolApi(session.access_token, params.id)
      router.push('/protocols')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao desativar protocolo')
      setShowDeleteConfirm(false)
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isNew && !protocol) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{error ?? 'Protocolo não encontrado'}</p>
        <button onClick={() => router.back()} className="text-sm text-primary hover:underline">
          Voltar
        </button>
      </div>
    )
  }

  const hasActiveJourneys = protocol?.steps && false // determined by API 409 on save attempt
  const readOnly = false

  const initialSteps = protocol
    ? protocol.steps.map(s => ({
        name: s.name,
        type: s.type,
        orderIndex: s.orderIndex,
        prerequisiteStepIds: s.prerequisiteStepIds,
        branchConditions: s.branchConditions,
        dueDays: s.dueDays ?? undefined,
      }))
    : undefined

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
        <h1 className="text-2xl font-bold">{isNew ? 'Novo Protocolo' : 'Editar Protocolo'}</h1>

        <div className="space-y-3">
          <div>
            <label htmlFor="proto-name" className="block text-sm font-medium mb-1">Nome</label>
            <input
              id="proto-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={readOnly}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
              required
            />
          </div>
          <div>
            <label htmlFor="proto-desc" className="block text-sm font-medium mb-1">Descrição (opcional)</label>
            <textarea
              id="proto-desc"
              value={description}
              onChange={e => setDescription(e.target.value)}
              disabled={readOnly}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="text-lg font-semibold">Etapas</h2>
        <ProtocolStepEditor
          initialSteps={initialSteps}
          readOnly={readOnly}
          onSave={handleSave}
          isSaving={isSaving}
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!isNew && (
        <div className="rounded-lg border border-red-200 bg-red-50/30 p-6">
          <h3 className="font-semibold text-red-800">Zona de Perigo</h3>
          <p className="text-sm text-red-600 mt-1">
            Desativar o protocolo impedirá que novas jornadas sejam criadas com ele.
          </p>
          {showDeleteConfirm ? (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Desativando...' : 'Confirmar Desativação'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-sm text-muted-foreground hover:underline"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="mt-3 flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Desativar Protocolo
            </button>
          )}
        </div>
      )}
    </div>
  )
}
