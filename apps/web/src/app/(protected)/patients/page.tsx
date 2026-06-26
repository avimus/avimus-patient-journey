'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/auth'
import { listPatients } from '@/lib/api-client'
import type { PatientListItem } from '@avimus/types'
import { PatientFilters } from '@/components/patients/patient-filters'
import { PatientTable } from '@/components/patients/patient-table'

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 20

  const fetchPatients = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createBrowserSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const result = await listPatients(session.access_token, { search: search || undefined, page, limit })
      setPatients(result.data)
      setTotal(result.total)
    } catch {
      // handled silently
    } finally {
      setLoading(false)
    }
  }, [router, search, page])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  function handleSearch(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Pacientes</h1>

      <PatientFilters value={search} onChange={handleSearch} />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <PatientTable
          patients={patients}
          total={total}
          page={page}
          limit={limit}
          onPageChange={setPage}
        />
      )}
    </div>
  )
}
