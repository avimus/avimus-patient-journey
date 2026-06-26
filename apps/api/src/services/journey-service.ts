import type { TenantPrismaClient } from '@avimus/db'
import type { UserRole, JourneyDetail, JourneyStep, CompleteStepResponse } from '@avimus/types'
import { ROLE_STEP_PERMISSIONS } from '@avimus/types'
import {
  resolveNextSteps,
  calculateProgress,
  getUnlockedSteps,
  applyBranchCondition,
  type ProtocolSnapshot,
  type JourneyStepState,
  type ProtocolStepDef,
} from '@avimus/protocol-engine'

export async function getJourneyDetail(
  db: TenantPrismaClient,
  journeyId: string,
  tenantId: string,
): Promise<JourneyDetail | null> {
  const journey = await db.patientJourney.findFirst({
    where: { id: journeyId, tenantId },
    include: {
      patient: true,
      protocol: true,
      steps: {
        include: { executedBy: true },
        orderBy: { protocolStepId: 'asc' },
      },
    },
  })

  if (!journey) return null

  const snapshot = journey.protocolSnapshot as unknown as ProtocolSnapshot
  const stepStates: JourneyStepState[] = journey.steps.map(s => ({
    protocolStepId: s.protocolStepId,
    status: s.status as JourneyStepState['status'],
    result: s.result,
  }))

  const resolution = resolveNextSteps(snapshot, stepStates)
  const progress = calculateProgress(stepStates)

  const stepDefMap = new Map(snapshot.steps.map(s => [s.id, s]))

  const steps: JourneyStep[] = journey.steps.map(s => {
    const def = stepDefMap.get(s.protocolStepId)
    const now = new Date()
    const stepStart = s.updatedAt
    const daysSinceUpdate = Math.floor((now.getTime() - stepStart.getTime()) / (1000 * 60 * 60 * 24))
    const isOverdue = def?.dueDays
      ? (s.status === 'pendente' || s.status === 'em_andamento') && daysSinceUpdate > def.dueDays
      : false

    return {
      id: s.id,
      protocolStepId: s.protocolStepId,
      status: s.status as JourneyStep['status'],
      executedAt: s.executedAt?.toISOString() ?? null,
      executedByName: s.executedBy?.name ?? null,
      result: s.result ?? null,
      notes: s.notes ?? null,
      stepName: def?.name ?? '',
      stepType: (def?.type ?? 'consulta') as JourneyStep['stepType'],
      stepOrderIndex: def?.orderIndex ?? 0,
      prerequisiteStepIds: def?.prerequisiteStepIds ?? [],
      branchConditions: (def?.branchConditions ?? {}) as Record<string, string[]>,
      dueDays: def?.dueDays ?? null,
      isOverdue,
    }
  })

  steps.sort((a, b) => a.stepOrderIndex - b.stepOrderIndex)

  return {
    id: journey.id,
    patientId: journey.patientId,
    patientName: journey.patient.fullName,
    protocolId: journey.protocolId,
    protocolName: journey.protocol.name,
    protocolSnapshot: snapshot,
    status: journey.status as JourneyDetail['status'],
    startedAt: journey.startedAt.toISOString(),
    completedAt: journey.completedAt?.toISOString() ?? null,
    createdAt: journey.createdAt.toISOString(),
    progress,
    nextStepId: resolution.nextStepId,
    steps,
  }
}

export async function completeStep(
  db: TenantPrismaClient,
  stepId: string,
  tenantId: string,
  userId: string,
  userRole: UserRole,
  body: { result?: string; notes?: string },
): Promise<{ success: true; data: CompleteStepResponse } | { success: false; status: number; error: Record<string, unknown> }> {
  const step = await db.journeyStep.findFirst({
    where: { id: stepId, tenantId },
    include: {
      executedBy: true,
      journey: {
        include: { patient: true, steps: { include: { executedBy: true } } },
      },
    },
  })

  if (!step) {
    return { success: false, status: 404, error: { error: 'Step not found', code: 'NOT_FOUND' } }
  }

  const journey = step.journey
  if (journey.status !== 'ativo') {
    if (journey.status === 'suspenso') {
      return { success: false, status: 409, error: { error: 'Jornada suspensa. Contate o administrador.', code: 'JOURNEY_SUSPENDED' } }
    }
    return { success: false, status: 409, error: { error: `Jornada com status ${journey.status}. Operação não permitida.`, code: 'INVALID_JOURNEY_STATUS' } }
  }

  if (step.status === 'concluido' || step.status === 'ignorado') {
    const completedByUser = step.executedBy
    return {
      success: false,
      status: 409,
      error: {
        error: 'Etapa já concluída',
        code: 'STEP_ALREADY_COMPLETED',
        completedBy: completedByUser?.name ?? 'Unknown',
        completedAt: step.executedAt?.toISOString() ?? '',
      },
    }
  }

  if (step.status === 'bloqueado') {
    return {
      success: false,
      status: 409,
      error: { error: 'Pré-requisitos não satisfeitos', code: 'PREREQUISITES_NOT_MET' },
    }
  }

  const snapshot = journey.protocolSnapshot as unknown as ProtocolSnapshot
  const stepDef = snapshot.steps.find(s => s.id === step.protocolStepId)
  if (!stepDef) {
    return { success: false, status: 500, error: { error: 'Step definition not found in snapshot', code: 'INTERNAL_ERROR' } }
  }

  const allowedTypes = ROLE_STEP_PERMISSIONS[userRole] ?? []
  if (!allowedTypes.includes(stepDef.type as typeof allowedTypes[number])) {
    const requiredRoles = Object.entries(ROLE_STEP_PERMISSIONS)
      .filter(([, types]) => types.includes(stepDef.type as typeof allowedTypes[number]))
      .map(([role]) => role)
    return {
      success: false,
      status: 403,
      error: {
        error: 'Role insuficiente para este tipo de etapa',
        code: 'INSUFFICIENT_ROLE',
        stepType: stepDef.type,
        requiredRoles,
        yourRole: userRole,
      },
    }
  }

  if (stepDef.type === 'diagnostico' && Object.keys(stepDef.branchConditions).length > 0) {
    if (!body.result || !(body.result in stepDef.branchConditions)) {
      return {
        success: false,
        status: 422,
        error: {
          error: 'Resultado não previsto nas condições de ramificação. Etapa marcada para revisão.',
          code: 'UNMATCHED_BRANCH_RESULT',
          validResults: Object.keys(stepDef.branchConditions),
        },
      }
    }
  }

  const user = await db.user.findFirst({ where: { id: userId, tenantId } })

  await db.journeyStep.update({
    where: { id: stepId },
    data: {
      status: 'concluido',
      executedAt: new Date(),
      executedById: userId,
      result: body.result ?? null,
      notes: body.notes ?? null,
    },
  })

  let updatedSteps = journey.steps.map(s =>
    s.id === stepId
      ? { protocolStepId: s.protocolStepId, status: 'concluido' as const, result: body.result ?? null }
      : { protocolStepId: s.protocolStepId, status: s.status as JourneyStepState['status'], result: s.result }
  )

  const unlockedIds: string[] = []
  const ignoredIds: string[] = []

  if (body.result && Object.keys(stepDef.branchConditions).length > 0) {
    const branchResult = applyBranchCondition(stepDef, body.result, snapshot)

    for (const activated of branchResult.activated) {
      const journeyStep = journey.steps.find(s => s.protocolStepId === activated.id)
      if (journeyStep && journeyStep.status === 'bloqueado') {
        unlockedIds.push(journeyStep.id)
      }
    }

    for (const ignored of branchResult.ignored) {
      const journeyStep = journey.steps.find(s => s.protocolStepId === ignored.id)
      if (journeyStep && journeyStep.status === 'bloqueado') {
        ignoredIds.push(journeyStep.id)
        await db.journeyStep.update({ where: { id: journeyStep.id }, data: { status: 'ignorado' } })
      }
    }

    updatedSteps = updatedSteps.map(s => {
      const js = journey.steps.find(j => j.protocolStepId === s.protocolStepId)
      if (js && ignoredIds.includes(js.id)) return { ...s, status: 'ignorado' as const }
      return s
    })
  }

  const unlocked = getUnlockedSteps(snapshot, updatedSteps)
  for (const unlockedDef of unlocked) {
    const journeyStep = journey.steps.find(s => s.protocolStepId === unlockedDef.id)
    if (journeyStep && !unlockedIds.includes(journeyStep.id)) {
      unlockedIds.push(journeyStep.id)
    }
  }

  for (const uid of unlockedIds) {
    await db.journeyStep.update({ where: { id: uid }, data: { status: 'pendente' } })
  }

  updatedSteps = updatedSteps.map(s => {
    const js = journey.steps.find(j => j.protocolStepId === s.protocolStepId)
    if (js && unlockedIds.includes(js.id)) return { ...s, status: 'pendente' as const }
    return s
  })

  const progress = calculateProgress(updatedSteps)
  const resolution = resolveNextSteps(snapshot, updatedSteps)

  let journeyStatus = journey.status
  if (progress === 100 && resolution.nextStepId === null) {
    await db.patientJourney.update({
      where: { id: journey.id },
      data: { status: 'concluido', completedAt: new Date() },
    })
    journeyStatus = 'concluido'
  }

  await db.dataAccessLog.create({
    data: {
      tenantId,
      userId,
      patientId: journey.patientId,
      action: 'COMPLETE_STEP',
      resourceType: 'step',
      resourceId: stepId,
    },
  })

  return {
    success: true,
    data: {
      completedStep: {
        id: stepId,
        status: 'concluido',
        executedAt: new Date().toISOString(),
        executedByName: user?.name ?? '',
        result: body.result ?? null,
        notes: body.notes ?? null,
      },
      unlockedStepIds: unlockedIds,
      ignoredStepIds: ignoredIds,
      nextStepId: resolution.nextStepId,
      progress,
      journeyStatus: journeyStatus as CompleteStepResponse['journeyStatus'],
    },
  }
}

export async function createJourney(
  db: TenantPrismaClient,
  patientId: string,
  protocolId: string,
  tenantId: string,
  userId: string,
): Promise<{ success: true; data: JourneyDetail } | { success: false; status: number; error: Record<string, unknown> }> {
  const patient = await db.patient.findFirst({ where: { id: patientId, tenantId } })
  if (!patient) return { success: false, status: 404, error: { error: 'Patient not found', code: 'NOT_FOUND' } }

  const protocol = await db.protocol.findFirst({
    where: { id: protocolId, tenantId },
    include: { steps: { orderBy: { orderIndex: 'asc' } } },
  })
  if (!protocol) return { success: false, status: 404, error: { error: 'Protocol not found', code: 'NOT_FOUND' } }

  const existingActive = await db.patientJourney.findFirst({
    where: { patientId, protocolId, tenantId, status: 'ativo' },
  })
  if (existingActive) {
    return { success: false, status: 409, error: { error: 'Paciente já possui jornada ativa neste protocolo', code: 'DUPLICATE_ACTIVE_JOURNEY' } }
  }

  const snapshot: ProtocolSnapshot = {
    id: protocol.id,
    name: protocol.name,
    steps: protocol.steps.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type as ProtocolStepDef['type'],
      orderIndex: s.orderIndex,
      prerequisiteStepIds: s.prerequisiteStepIds,
      branchConditions: s.branchConditions as Record<string, string[]>,
      dueDays: s.dueDays,
    })),
  }

  const journey = await db.patientJourney.create({
    data: {
      tenantId,
      patientId,
      protocolId,
      protocolSnapshot: snapshot as unknown as Record<string, unknown>,
      status: 'ativo',
      createdById: userId,
    },
  })

  const initialStates: JourneyStepState[] = snapshot.steps.map(s => ({
    protocolStepId: s.id,
    status: 'bloqueado',
  }))

  const unlocked = getUnlockedSteps(snapshot, initialStates)
  const unlockedIds = new Set(unlocked.map(s => s.id))

  await Promise.all(
    snapshot.steps.map(s =>
      db.journeyStep.create({
        data: {
          tenantId,
          journeyId: journey.id,
          protocolStepId: s.id,
          status: unlockedIds.has(s.id) ? 'pendente' : 'bloqueado',
        },
      })
    )
  )

  await db.dataAccessLog.create({
    data: {
      tenantId,
      userId,
      patientId,
      action: 'CREATE_JOURNEY',
      resourceType: 'journey',
      resourceId: journey.id,
    },
  })

  const detail = await getJourneyDetail(db, journey.id, tenantId)
  return { success: true, data: detail! }
}
