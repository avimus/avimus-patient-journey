import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { AppEnv } from '../index'
import { CreateJourneySchema, UpdateJourneyStatusSchema } from '@avimus/types'
import { getJourneyDetail, createJourney } from '../services/journey-service'
import { calculateProgress, resolveNextSteps, type ProtocolSnapshot, type JourneyStepState } from '@avimus/protocol-engine'

export const journeysRoutes = new Hono<AppEnv>()

journeysRoutes.get('/', async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')

  const page = Math.max(1, Number(c.req.query('page') ?? '1'))
  const limit = Math.min(100, Math.max(1, Number(c.req.query('limit') ?? '20')))
  const statusFilter = c.req.query('status')
  const patientIdFilter = c.req.query('patientId')

  const where: Record<string, unknown> = { tenantId }
  if (statusFilter) where.status = statusFilter
  if (patientIdFilter) where.patientId = patientIdFilter

  const [journeys, total] = await Promise.all([
    db.patientJourney.findMany({
      where,
      include: {
        patient: true,
        protocol: true,
        steps: true,
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.patientJourney.count({ where }),
  ])

  const data = journeys.map(j => {
    const snapshot = j.protocolSnapshot as unknown as ProtocolSnapshot
    const stepStates: JourneyStepState[] = j.steps.map(s => ({
      protocolStepId: s.protocolStepId,
      status: s.status as JourneyStepState['status'],
      result: s.result,
    }))
    const progress = calculateProgress(stepStates)
    const resolution = resolveNextSteps(snapshot, stepStates)

    const currentStepDef = resolution.nextStepId
      ? snapshot.steps.find(s => s.id === resolution.nextStepId)
      : null

    const now = new Date()
    const hasOverdue = j.steps.some(s => {
      if (s.status !== 'pendente' && s.status !== 'em_andamento') return false
      const def = snapshot.steps.find(d => d.id === s.protocolStepId)
      if (!def?.dueDays) return false
      const daysSince = Math.floor((now.getTime() - s.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
      return daysSince > def.dueDays
    })

    return {
      id: j.id,
      patientId: j.patientId,
      patientName: j.patient.fullName,
      protocolName: j.protocol.name,
      status: j.status,
      startedAt: j.startedAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
      progress,
      isOverdue: hasOverdue,
      currentStepName: currentStepDef?.name ?? null,
      updatedAt: j.updatedAt.toISOString(),
    }
  })

  return c.json({ data, total, page, limit })
})

journeysRoutes.get('/:id', async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')

  const detail = await getJourneyDetail(db, id, tenantId)
  if (!detail) {
    return c.json({ error: 'Journey not found', code: 'NOT_FOUND' }, 404)
  }

  await db.dataAccessLog.create({
    data: {
      tenantId,
      userId,
      patientId: detail.patientId,
      action: 'VIEW_JOURNEY',
      resourceType: 'journey',
      resourceId: id,
    },
  })

  return c.json(detail)
})

journeysRoutes.post('/', zValidator('json', CreateJourneySchema), async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const result = await createJourney(db, body.patientId, body.protocolId, tenantId, userId)
  if (!result.success) {
    return c.json(result.error, result.status as 404)
  }

  return c.json(result.data, 201)
})

journeysRoutes.patch('/:id/status', zValidator('json', UpdateJourneyStatusSchema), async (c) => {
  const role = c.get('role')
  if (role !== 'admin') {
    return c.json({ error: 'Apenas administradores podem alterar status de jornadas', code: 'FORBIDDEN' }, 403)
  }

  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')
  const body = c.req.valid('json')

  const journey = await db.patientJourney.findFirst({ where: { id, tenantId } })
  if (!journey) {
    return c.json({ error: 'Journey not found', code: 'NOT_FOUND' }, 404)
  }

  const validTransitions: Record<string, string[]> = {
    ativo: ['suspenso', 'cancelado'],
    suspenso: ['ativo', 'cancelado'],
  }
  const allowed = validTransitions[journey.status] ?? []
  if (!allowed.includes(body.status)) {
    return c.json({
      error: `Transição de "${journey.status}" para "${body.status}" não permitida`,
      code: 'INVALID_STATUS_TRANSITION',
    }, 409)
  }

  const updated = await db.patientJourney.update({
    where: { id },
    data: { status: body.status },
  })

  const action = body.status === 'suspenso' ? 'SUSPEND_JOURNEY'
    : body.status === 'cancelado' ? 'CANCEL_JOURNEY'
    : 'REACTIVATE_JOURNEY'

  await db.dataAccessLog.create({
    data: {
      tenantId,
      userId,
      patientId: journey.patientId,
      action,
      resourceType: 'journey',
      resourceId: id,
    },
  })

  return c.json({
    id: updated.id,
    status: updated.status,
    updatedAt: updated.updatedAt.toISOString(),
  })
})
