import { createBrowserClient, createServerClient } from '@supabase/ssr'
import type { UserRole } from '@avimus/types'

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

export function createServerSupabaseClient(cookieStore: {
  getAll: () => { name: string; value: string }[]
  set: (name: string, value: string, options: Record<string, unknown>) => void
}) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    },
  )
}

export interface SessionInfo {
  accessToken: string
  userId: string
  email: string
  tenantId: string
  tenantName: string
  role: UserRole
  userName: string
}

export async function getSession(cookieStore: {
  getAll: () => { name: string; value: string }[]
  set: (name: string, value: string, options: Record<string, unknown>) => void
}): Promise<SessionInfo | null> {
  const supabase = createServerSupabaseClient(cookieStore)
  const { data: { session } } = await supabase.auth.getSession()

  if (!session?.user) return null

  const tenantId = session.user.user_metadata?.tenant_id as string | undefined
  const role = session.user.user_metadata?.role as UserRole | undefined
  const userName = session.user.user_metadata?.name as string | undefined
  const tenantName = session.user.user_metadata?.tenant_name as string | undefined

  if (!tenantId || !role) return null

  return {
    accessToken: session.access_token,
    userId: session.user.id,
    email: session.user.email ?? '',
    tenantId,
    tenantName: tenantName ?? '',
    role,
    userName: userName ?? session.user.email ?? '',
  }
}
