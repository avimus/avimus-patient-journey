import { createMiddleware } from 'hono/factory'
import { createPrismaClient, type TenantPrismaClient } from '@avimus/db'
import type { JWTPayload, UserRole } from '@avimus/types'

type TenantEnv = {
  Variables: {
    jwtPayload: JWTPayload
    tenantId: string
    userId: string
    role: UserRole
    db: TenantPrismaClient
  }
}

export const tenantMiddleware = createMiddleware<TenantEnv>(async (c, next) => {
  const payload = c.get('jwtPayload')

  if (!payload.tenant_id) {
    return c.json({ error: 'Missing tenant_id in token', code: 'MISSING_TENANT' }, 401)
  }

  if (!payload.role) {
    return c.json({ error: 'Missing role in token', code: 'MISSING_ROLE' }, 401)
  }

  c.set('tenantId', payload.tenant_id)
  c.set('userId', payload.sub)
  c.set('role', payload.role as UserRole)
  c.set('db', createPrismaClient(payload.tenant_id))
  await next()
})
