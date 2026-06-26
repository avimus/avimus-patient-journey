import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { authMiddleware } from './middleware/auth'
import { tenantMiddleware } from './middleware/tenant'
import { patientsRoutes } from './routes/patients'
import { journeysRoutes } from './routes/journeys'
import { protocolsRoutes } from './routes/protocols'
import { stepsRoutes } from './routes/steps'
import { dashboardRoutes } from './routes/dashboard'
import type { TenantPrismaClient } from '@avimus/db'
import type { JWTPayload, UserRole } from '@avimus/types'

export type AppEnv = {
  Variables: {
    jwtPayload: JWTPayload
    tenantId: string
    userId: string
    role: UserRole
    db: TenantPrismaClient
  }
}

const app = new Hono<AppEnv>()

app.use('*', cors())
app.use('/api/v1/*', authMiddleware)
app.use('/api/v1/*', tenantMiddleware)

app.route('/api/v1/patients', patientsRoutes)
app.route('/api/v1/journeys', journeysRoutes)
app.route('/api/v1/protocols', protocolsRoutes)
app.route('/api/v1/steps', stepsRoutes)
app.route('/api/v1/dashboard', dashboardRoutes)

app.notFound((c) => {
  return c.json({ error: 'Route not found', code: 'ROUTE_NOT_FOUND' }, 404)
})

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error', code: 'INTERNAL_ERROR' }, 500)
})

export { app }
