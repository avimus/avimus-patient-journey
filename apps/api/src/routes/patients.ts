import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { AppEnv } from '../index'
import { CreatePatientSchema } from '@avimus/types'
import { listPatients, getPatient } from '../services/patient-service'

export const patientsRoutes = new Hono<AppEnv>()

patientsRoutes.get('/', async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')

  const search = c.req.query('search')
  const page = Number(c.req.query('page') ?? '1')
  const limit = Number(c.req.query('limit') ?? '20')

  const result = await listPatients(db, tenantId, { search, page, limit })
  return c.json(result)
})

patientsRoutes.get('/:id', async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const id = c.req.param('id')

  const patient = await getPatient(db, tenantId, id)
  if (!patient) {
    return c.json({ error: 'Patient not found', code: 'NOT_FOUND' }, 404)
  }

  await db.dataAccessLog.create({
    data: {
      tenantId,
      userId,
      patientId: id,
      action: 'VIEW_PATIENT',
      resourceType: 'patient',
      resourceId: id,
    },
  })

  return c.json(patient)
})

patientsRoutes.post('/', zValidator('json', CreatePatientSchema), async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')
  const userId = c.get('userId')
  const body = c.req.valid('json')

  const patient = await db.patient.create({
    data: {
      tenantId,
      fullName: body.fullName,
      cpf: body.cpf,
      birthDate: new Date(body.birthDate),
      contactPhone: body.contactPhone ?? null,
      contactEmail: body.contactEmail ?? null,
      lgpdLegalBasis: body.lgpdLegalBasis,
    },
  })

  await db.dataAccessLog.create({
    data: {
      tenantId,
      userId,
      patientId: patient.id,
      action: 'CREATE_PATIENT',
      resourceType: 'patient',
      resourceId: patient.id,
    },
  })

  return c.json({
    id: patient.id,
    fullName: patient.fullName,
    cpf: patient.cpf,
    birthDate: patient.birthDate.toISOString(),
    contactPhone: patient.contactPhone,
    contactEmail: patient.contactEmail,
    lgpdLegalBasis: patient.lgpdLegalBasis,
    createdAt: patient.createdAt.toISOString(),
    journeys: [],
  }, 201)
})
