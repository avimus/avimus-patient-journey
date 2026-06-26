'use client'

import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/auth'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <h1 className="text-lg font-semibold">{title ?? ''}</h1>
      <button
        onClick={handleSignOut}
        className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
      >
        Sair
      </button>
    </header>
  )
}
