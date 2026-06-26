'use client'

import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { ProtocolListItem } from '@avimus/types'

interface ProtocolListProps {
  protocols: ProtocolListItem[]
}

export function ProtocolList({ protocols }: ProtocolListProps) {
  const router = useRouter()

  if (protocols.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        Nenhum protocolo cadastrado
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
              <th className="px-4 py-3 text-left font-medium">Etapas</th>
              <th className="px-4 py-3 text-left font-medium">Jornadas Ativas</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {protocols.map(p => (
              <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <span className="font-medium">{p.name}</span>
                    {p.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{p.description}</p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums">{p.stepCount}</td>
                <td className="px-4 py-3 tabular-nums">{p.activeJourneyCount}</td>
                <td className="px-4 py-3">
                  <span className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-semibold',
                    p.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600',
                  )}>
                    {p.isActive ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => router.push(`/protocols/${p.id}`)}
                    className="text-sm text-primary hover:underline"
                  >
                    Ver / Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
