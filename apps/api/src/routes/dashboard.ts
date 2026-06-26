import { Hono } from 'hono'
import type { AppEnv } from '../index'
import type { ProtocolSnapshot } from '@avimus/protocol-engine'
import { resolveNextSteps, type JourneyStepState } from '@avimus/protocol-engine'

export const dashboardRoutes = new Hono<AppEnv>()

dashboardRoutes.get('/stats', async (c) => {
  const db = c.get('db')
  const tenantId = c.get('tenantId')

  const [
    totalPatients,
    activeJourneys,
    completedJourneys,
    suspendedJourneys,
  ] = await Promise.all([
    db.patient.count({ where: { tenantId } }),
    db.patientJourney.count({ where: { tenantId, status: 'ativo' } }),
    db.patientJourney.count({ where: { tenantId, status: 'concluido' } }),
    db.patientJourney.count({ where: { tenantId, status: 'suspenso' } }),
  ])

  const activeJourneyRows = await db.patientJourney.findMany({
    where: { tenantId, status: 'ativo' },
    include: {
      patient: true,
      protocol: true,
      steps: true,
    },
  })

  const now = new Date()
  const overdueItems: {
    journeyId: string
    patientName: string
    protocolName: string
    currentStepName: string
    daysSinceStepStart: number
    dueDays: number
  }[] = []

  for (const j of activeJourneyRows) {
    const snapshot = j.protocolSnapshot as unknown as ProtocolSnapshot
    const stepStates: JourneyStepState[] = j.steps.map(s => ({
      protocolStepId: s.protocolStepId,
      status: s.status as JourneyStepState['status'],
      result: s.result,
    }))
    const resolution = resolveNextSteps(snapshot, stepStates)

    if (!resolution.nextStepId) continue

    const currentStepDef = snapshot.steps.find(s => s.id === resolution.nextStepId)
    if (!currentStepDef?.dueDays) continue

    const currentStep = j.steps.find(s => s.protocolStepId === resolution.nextStepId)
    if (!currentStep) continue

    const daysSince = Math.floor((now.getTime() - currentStep.updatedAt.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince > currentStepDef.dueDays) {
      overdueItems.push({
        journeyId: j.id,
        patientName: j.patient.fullName,
        protocolName: j.protocol.name,
        currentStepName: currentStepDef.name,
        daysSinceStepStart: daysSince,
        dueDays: currentStepDef.dueDays,
      })
    }
  }

  overdueItems.sort((a, b) => (b.daysSinceStepStart - b.dueDays) - (a.daysSinceStepStart - a.dueDays))
  const overdueList = overdueItems.slice(0, 10)

  return c.json({
    totalPatients,
    activeJourneys,
    overdueJourneys: overdueItems.length,
    suspendedJourneys,
    completedJourneys,
    overdueList,
  })
})
