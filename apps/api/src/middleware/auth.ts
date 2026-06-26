import { createMiddleware } from 'hono/factory'
import { createClient } from '@supabase/supabase-js'
import type { JWTPayload, UserRole } from '@avimus/types'

type AuthEnv = {
  Variables: {
    jwtPayload: JWTPayload
  }
}

export const authMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', code: 'MISSING_TOKEN' }, 401)
  }

  const token = authHeader.slice(7)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return c.json({ error: 'Server configuration error', code: 'INTERNAL_ERROR' }, 500)
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return c.json({ error: 'Invalid or expired token', code: 'INVALID_TOKEN' }, 401)
  }

  const payload: JWTPayload = {
    sub: user.id,
    email: user.email ?? '',
    tenant_id: (user.user_metadata?.tenant_id as string) ?? '',
    role: ((user.user_metadata?.role as string) ?? 'medico') as UserRole,
    iat: 0,
    exp: 0,
  }

  c.set('jwtPayload', payload)
  await next()
})
