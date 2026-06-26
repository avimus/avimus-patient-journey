'use client'

import { useRouter } from 'next/navigation'
import { cn, formatCPF, relativeDate } from '@/lib/utils'
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react'
import type { PatientListItem } from '@avimus/types'

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

interface PatientTableProps {
  patients: PatientListItem[]
  total: number
  page: number
  limit: number
  onPageChange: (page: number) => void
}

export function PatientTable({ patients, total, page, limit, onPageChange }: PatientTableProps) {
  const router = useRouter()
  const totalPages = Math.ceil(total / limit)

  if (patients.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Nenhum paciente encontrado
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Nome</th>
              <th className="px-4 py-3 text-left font-medium">CPF</th>
              <th className="px-4 py-3 text-left font-medium">Protocolo</th>
              <th className="px-4 py-3 text-left font-medium">Etapa Atual</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Atualização</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {patients.map(p => {
              const aj = p.activeJourney
              return (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/patients/${p.id}`)}
                  className={cn(
                    'cursor-pointer hover:bg-muted/30 transition-colors',
                    aj?.isOverdue && 'bg-amber-50/40',
                  )}
                >
                  <td className="px-4 py-3 font-medium">{p.fullName}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{formatCPF(p.cpf)}</td>
                  <td className="px-4 py-3">{aj?.protocolName ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {aj?.currentStepName ?? '—'}
                      {aj?.isOverdue && <AlertTriangle className="h-3 w-3 text-red-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {aj ? (
                      <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_COLORS[aj.status])}>
                        {STATUS_LABELS[aj.status] ?? aj.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {aj?.updatedAt ? relativeDate(aj.updatedAt) : '—'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-xs text-muted-foreground">
            {total} paciente(s) &middot; Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="rounded p-1 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded p-1 hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
