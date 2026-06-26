'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/auth'
import { getDashboardStats } from '@/lib/api-client'
import type { DashboardStats } from '@avimus/types'
import { MetricCard } from '@/components/dashboard/metric-card'
import { OverdueList } from '@/components/dashboard/overdue-list'

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.push('/login'); return }

        const data = await getDashboardStats(session.access_token)
        setStats(data)
      } catch {
        // handled silently
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Erro ao carregar dados do dashboard
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total de Pacientes"
          value={stats.totalPatients}
        />
        <MetricCard
          label="Jornadas Ativas"
          value={stats.activeJourneys}
          variant="default"
        />
        <MetricCard
          label="Jornadas Atrasadas"
          value={stats.overdueJourneys}
          variant="warning"
        />
        <MetricCard
          label="Jornadas Concluídas"
          value={stats.completedJourneys}
          variant="success"
          subtitle={stats.suspendedJourneys > 0 ? `${stats.suspendedJourneys} suspensa(s)` : undefined}
        />
      </div>

      <OverdueList items={stats.overdueList} />
    </div>
  )
}
