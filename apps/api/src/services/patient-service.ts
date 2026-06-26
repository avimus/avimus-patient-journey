import type { TenantPrismaClient } from '@avimus/db'
import type { PatientListResponse, PatientDetail, PatientListItem } from '@avimus/types'
import { calculateProgress, resolveNextSteps, type ProtocolSnapshot, type JourneyStepState } from '@avimus/protocol-engine'

export async function listPatients(
  db: TenantPrismaClient,
  tenantId: string,
  params: { search?: string; page?: number; limit?: number },
): Promise<PatientListResponse> {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 20))

  const where: Record<string, unknown> = { tenantId }
  if (params.search) {
    where.OR = [
      { fullName: { contains: params.search, mode: 'insensitive' } },
      { cpf: { contains: params.search } },
    ]
  }

  const [patients, total] = await Promise.all([
    db.patient.findMany({
      where,
      include: {
        journeys: {
          where: { status: 'ativo' },
          include: { protocol: true, steps: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { fullName: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.patient.count({ where }),
  ])

  const data: PatientListItem[] = patients.map(p => {
    const activeJourney = p.journeys[0]
    let activeJourneyData: PatientListItem['activeJourney'] = null

    if (activeJourney) {
      const snapshot = activeJourney.protocolSnapshot as unknown as ProtocolSnapshot
      const stepStates: JourneyStepState[] = activeJourney.steps.map(s => ({
        protocolStepId: s.protocolStepId,
        status: s.status as JourneyStepState['status'],
        result: s.result,
      }))
      const resolution = resolveNextSteps(snapshot, stepStates)
      const currentStepDef = resolution.nextStepId
        ? snapshot.steps.find(s => s.id === resolution.nextStepId)
        : null

      const now = new Date()
      let isOverdue = false
      if (currentStepDef?.dueDays) {
        const currentStep = activeJourney.steps.find(s => s.protocolStepId === resolution.nextStepId)
        if (currentStep) {
          const daysSince = Math.floor((now.getTime() - currentStep.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
          isOverdue = daysSince > currentStepDef.dueDays
        }
      }

      activeJourneyData = {
        id: activeJourney.id,
        protocolName: activeJourney.protocol.name,
        currentStepName: currentStepDef?.name ?? null,
        status: activeJourney.status as PatientListItem['activeJourney'] extends null ? never : NonNullable<PatientListItem['activeJourney']>['status'],
        isOverdue,
        updatedAt: activeJourney.updatedAt.toISOString(),
      }
    }

    return {
      id: p.id,
      fullName: p.fullName,
      cpf: p.cpf,
      birthDate: p.birthDate.toISOString(),
      activeJourney: activeJourneyData,
    }
  })

  return { data, total, page, limit }
}

export async function getPatient(
  db: TenantPrismaClient,
  tenantId: string,
  patientId: string,
): Promise<PatientDetail | null> {
  const patient = await db.patient.findFirst({
    where: { id: patientId, tenantId },
    include: {
      journeys: {
        include: { protocol: true, steps: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!patient) return null

  const journeys = patient.journeys.map(j => {
    const stepStates: JourneyStepState[] = j.steps.map(s => ({
      protocolStepId: s.protocolStepId,
      status: s.status as JourneyStepState['status'],
      result: s.result,
    }))
    const progress = calculateProgress(stepStates)

    return {
      id: j.id,
      protocolName: j.protocol.name,
      status: j.status as 'ativo' | 'concluido' | 'suspenso' | 'cancelado',
      startedAt: j.startedAt.toISOString(),
      completedAt: j.completedAt?.toISOString() ?? null,
      progress,
    }
  })

  return {
    id: patient.id,
    fullName: patient.fullName,
    cpf: patient.cpf,
    birthDate: patient.birthDate.toISOString(),
    contactPhone: patient.contactPhone,
    contactEmail: patient.contactEmail,
    lgpdLegalBasis: patient.lgpdLegalBasis,
    createdAt: patient.createdAt.toISOString(),
    journeys,
  }
}
