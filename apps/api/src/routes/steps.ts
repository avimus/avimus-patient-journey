import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { AppEnv } from '../index'
import { CompleteStepSchema } from '@avimus/types'
import { completeStep } from '../services/journey-service'

export const stepsRoutes = new Hono<AppEnv>()

stepsRoutes.patch('/:id/complete', zValidator('json', CompleteStepSchema), async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const role = c.get('role')
  const stepId = c.req.param('id')
  const body = c.req.valid('json')

  const result = await completeStep(db, stepId, tenantId, userId, role, body)
  if (!result.success) {
    return c.json(result.error, result.status as 404)
  }

  return c.json(result.data)
})
