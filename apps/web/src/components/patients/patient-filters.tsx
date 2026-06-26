'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'

interface PatientFiltersProps {
  value: string
  onChange: (search: string) => void
}

export function PatientFilters({ value, onChange }: PatientFiltersProps) {
  const [input, setInput] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (input !== value) onChange(input)
    }, 300)
    return () => clearTimeout(timer)
  }, [input, value, onChange])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Buscar por nome ou CPF..."
        className="w-full rounded-md border pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
    </div>
  )
}
