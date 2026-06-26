import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { AppEnv } from '../index'
import { CreateProtocolSchema } from '@avimus/types'
import {
  listProtocols,
  getProtocolDetail,
  createProtocol,
  updateProtocol,
  deleteProtocol,
} from '../services/protocol-service'

export const protocolsRoutes = new Hono<AppEnv>()

protocolsRoutes.get('/', async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')

  const result = await listProtocols(db, tenantId)
  return c.json(result)
})

protocolsRoutes.get('/:id', async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const protocol = await getProtocolDetail(db, tenantId, id)
  if (!protocol) {
    return c.json({ error: 'Protocol not found', code: 'NOT_FOUND' }, 404)
  }

  return c.json(protocol)
})

protocolsRoutes.post('/', zValidator('json', CreateProtocolSchema), async (c) => {
  const role = c.get('role')
  if (role !== 'admin') {
    return c.json({ error: 'Apenas administradores podem criar protocolos', code: 'FORBIDDEN' }, 403)
  }

  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const body = c.req.valid('json')

  const result = await createProtocol(db, tenantId, body)
  return c.json(result, 201)
})

protocolsRoutes.put('/:id', zValidator('json', CreateProtocolSchema), async (c) => {
  const role = c.get('role')
  if (role !== 'admin') {
    return c.json({ error: 'Apenas administradores podem editar protocolos', code: 'FORBIDDEN' }, 403)
  }

  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const result = await updateProtocol(db, tenantId, id, body)
  if (!result.success) {
    return c.json(result.error, result.status as 404)
  }

  return c.json(result.data)
})

protocolsRoutes.delete('/:id', async (c) => {
  const role = c.get('role')
  if (role !== 'admin') {
    return c.json({ error: 'Apenas administradores podem desativar protocolos', code: 'FORBIDDEN' }, 403)
  }

  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const id = c.req.param('id')

  const result = await deleteProtocol(db, tenantId, id)
  if (!result.success) {
    return c.json(result.error, result.status as 404)
  }

  return c.json(result.data)
})
