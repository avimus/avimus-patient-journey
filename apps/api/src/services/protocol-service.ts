import type { TenantPrismaClient } from '@avimus/db'
import type { ProtocolDetail, ProtocolListResponse, CreateProtocol } from '@avimus/types'

export async function listProtocols(
  db: TenantPrismaClient,
  tenantId: string,
): Promise<ProtocolListResponse> {
  const protocols = await db.protocol.findMany({
    where: { tenantId },
    include: {
      steps: true,
      journeys: {
        where: { status: { in: ['ativo', 'suspenso'] } },
      },
    },
    orderBy: { name: 'asc' },
  })

  return {
    data: protocols.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      isActive: p.isActive,
      stepCount: p.steps.length,
      activeJourneyCount: p.journeys.length,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  }
}

export async function getProtocolDetail(
  db: TenantPrismaClient,
  tenantId: string,
  protocolId: string,
): Promise<ProtocolDetail | null> {
  const protocol = await db.protocol.findFirst({
    where: { id: protocolId, tenantId },
    include: { steps: { orderBy: { orderIndex: 'asc' } } },
  })

  if (!protocol) return null

  return {
    id: protocol.id,
    tenantId: protocol.tenantId,
    name: protocol.name,
    description: protocol.description,
    isActive: protocol.isActive,
    createdAt: protocol.createdAt.toISOString(),
    updatedAt: protocol.updatedAt.toISOString(),
    steps: protocol.steps.map(s => ({
      id: s.id,
      name: s.name,
      type: s.type as 'consulta' | 'exame' | 'diagnostico' | 'procedimento' | 'retorno',
      orderIndex: s.orderIndex,
      prerequisiteStepIds: s.prerequisiteStepIds,
      branchConditions: s.branchConditions as Record<string, string[]>,
      dueDays: s.dueDays,
    })),
  }
}

export async function createProtocol(
  db: TenantPrismaClient,
  tenantId: string,
  body: CreateProtocol,
): Promise<ProtocolDetail> {
  const protocol = await db.protocol.create({
    data: {
      tenantId,
      name: body.name,
      description: body.description ?? null,
    },
  })

  const stepIdMap = new Map<number, string>()

  for (const stepInput of body.steps) {
    const step = await db.protocolStep.create({
      data: {
        tenantId,
        protocolId: protocol.id,
        name: stepInput.name,
        type: stepInput.type,
        orderIndex: stepInput.orderIndex,
        prerequisiteStepIds: stepInput.prerequisiteStepIds.map(ref => {
          const idx = parseInt(ref, 10)
          return stepIdMap.get(idx) ?? ref
        }),
        branchConditions: Object.fromEntries(
          Object.entries(stepInput.branchConditions).map(([key, refs]) => [
            key,
            refs.map(ref => {
              const idx = parseInt(ref, 10)
              return stepIdMap.get(idx) ?? ref
            }),
          ]),
        ),
        dueDays: stepInput.dueDays ?? null,
      },
    })
    stepIdMap.set(stepInput.orderIndex, step.id)
  }

  return (await getProtocolDetail(db, tenantId, protocol.id))!
}

export async function updateProtocol(
  db: TenantPrismaClient,
  tenantId: string,
  protocolId: string,
  body: CreateProtocol,
): Promise<{ success: true; data: ProtocolDetail } | { success: false; status: number; error: Record<string, unknown> }> {
  const protocol = await db.protocol.findFirst({
    where: { id: protocolId, tenantId },
    include: {
      journeys: { where: { status: { in: ['ativo', 'suspenso'] } } },
    },
  })

  if (!protocol) {
    return { success: false, status: 404, error: { error: 'Protocol not found', code: 'NOT_FOUND' } }
  }

  if (protocol.journeys.length > 0) {
    return {
      success: false,
      status: 409,
      error: {
        error: `Protocolo possui ${protocol.journeys.length} jornada(s) ativa(s)/suspensa(s). Não é possível editar.`,
        code: 'ACTIVE_JOURNEYS_EXIST',
        activeJourneyCount: protocol.journeys.length,
      },
    }
  }

  await db.protocol.update({
    where: { id: protocolId },
    data: { name: body.name, description: body.description ?? null },
  })

  await db.protocolStep.deleteMany({ where: { protocolId } })

  const stepIdMap = new Map<number, string>()
  for (const stepInput of body.steps) {
    const step = await db.protocolStep.create({
      data: {
        tenantId,
        protocolId,
        name: stepInput.name,
        type: stepInput.type,
        orderIndex: stepInput.orderIndex,
        prerequisiteStepIds: stepInput.prerequisiteStepIds.map(ref => {
          const idx = parseInt(ref, 10)
          return stepIdMap.get(idx) ?? ref
        }),
        branchConditions: Object.fromEntries(
          Object.entries(stepInput.branchConditions).map(([key, refs]) => [
            key,
            refs.map(ref => {
              const idx = parseInt(ref, 10)
              return stepIdMap.get(idx) ?? ref
            }),
          ]),
        ),
        dueDays: stepInput.dueDays ?? null,
      },
    })
    stepIdMap.set(stepInput.orderIndex, step.id)
  }

  return { success: true, data: (await getProtocolDetail(db, tenantId, protocolId))! }
}

export async function deleteProtocol(
  db: TenantPrismaClient,
  tenantId: string,
  protocolId: string,
): Promise<{ success: true; data: { id: string; isActive: boolean } } | { success: false; status: number; error: Record<string, unknown> }> {
  const protocol = await db.protocol.findFirst({
    where: { id: protocolId, tenantId },
    include: {
      journeys: { where: { status: { in: ['ativo', 'suspenso'] } } },
    },
  })

  if (!protocol) {
    return { success: false, status: 404, error: { error: 'Protocol not found', code: 'NOT_FOUND' } }
  }

  if (protocol.journeys.length > 0) {
    return {
      success: false,
      status: 409,
      error: {
        error: `Protocolo possui ${protocol.journeys.length} jornada(s) ativa(s)/suspensa(s). Não é possível desativar.`,
        code: 'ACTIVE_JOURNEYS_EXIST',
        activeJourneyCount: protocol.journeys.length,
      },
    }
  }

  const updated = await db.protocol.update({
    where: { id: protocolId },
    data: { isActive: false },
  })

  return { success: true, data: { id: updated.id, isActive: updated.isActive } }
}
