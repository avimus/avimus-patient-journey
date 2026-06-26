'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/auth'
import { listProtocols } from '@/lib/api-client'
import type { ProtocolListItem } from '@avimus/types'
import { ProtocolList } from '@/components/protocols/protocol-list'
import { Plus } from 'lucide-react'

export default function ProtocolsPage() {
  const router = useRouter()
  const [protocols, setProtocols] = useState<ProtocolListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const result = await listProtocols(session.access_token)
        setProtocols(result.data)
      } catch {
        // handled silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Protocolos</h1>
        <button
          onClick={() => router.push('/protocols/new')}
          className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Protocolo
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <ProtocolList protocols={protocols} />
      )}
    </div>
  )
}
