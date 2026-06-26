import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clean existing data
  await prisma.dataAccessLog.deleteMany()
  await prisma.journeyStep.deleteMany()
  await prisma.patientJourney.deleteMany()
  await prisma.protocolStep.deleteMany()
  await prisma.protocol.deleteMany()
  await prisma.patient.deleteMany()
  await prisma.user.deleteMany()
  await prisma.tenant.deleteMany()

  // ── Tenants ──
  const tenantA = await prisma.tenant.create({
    data: { id: 'tenant-a-uuid-0001', name: 'Clínica São Lucas', slug: 'clinica-sao-lucas', plan: 'professional' },
  })

  const tenantB = await prisma.tenant.create({
    data: { id: 'tenant-b-uuid-0001', name: 'Hospital Vitória', slug: 'hospital-vitoria', plan: 'enterprise' },
  })

  // ── Users ──
  const usersA = await Promise.all([
    prisma.user.create({ data: { id: 'user-a1', tenantId: tenantA.id, email: 'ricardo@saolucas.com', name: 'Dr. Ricardo Alves', role: 'admin' } }),
    prisma.user.create({ data: { id: 'user-a2', tenantId: tenantA.id, email: 'fernanda@saolucas.com', name: 'Dra. Fernanda Costa', role: 'medico' } }),
    prisma.user.create({ data: { id: 'user-a3', tenantId: tenantA.id, email: 'carla@saolucas.com', name: 'Carla Souza', role: 'recepcionista' } }),
  ])

  const usersB = await Promise.all([
    prisma.user.create({ data: { id: 'user-b1', tenantId: tenantB.id, email: 'paulo@hospitalvitoria.com', name: 'Dr. Paulo Mendes', role: 'admin' } }),
    prisma.user.create({ data: { id: 'user-b2', tenantId: tenantB.id, email: 'ana@hospitalvitoria.com', name: 'Dra. Ana Lima', role: 'medico' } }),
    prisma.user.create({ data: { id: 'user-b3', tenantId: tenantB.id, email: 'joao@hospitalvitoria.com', name: 'João Oliveira', role: 'recepcionista' } }),
  ])

  // ── Protocols for Tenant A ──
  const protoColicaA = await prisma.protocol.create({
    data: { id: 'proto-colica-a', tenantId: tenantA.id, name: 'Protocolo de Cólica Renal', description: 'Fluxo completo para investigação e tratamento de cólica renal' },
  })

  const colicaStepsA = await Promise.all([
    prisma.protocolStep.create({ data: { id: 'psa-1', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Triagem Inicial', type: 'consulta', orderIndex: 1, prerequisiteStepIds: [], branchConditions: {}, dueDays: 1 } }),
    prisma.protocolStep.create({ data: { id: 'psa-2', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Exame Laboratorial', type: 'exame', orderIndex: 2, prerequisiteStepIds: ['psa-1'], branchConditions: {}, dueDays: 3 } }),
    prisma.protocolStep.create({ data: { id: 'psa-3', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Exame de Imagem (USG)', type: 'exame', orderIndex: 3, prerequisiteStepIds: ['psa-2'], branchConditions: {}, dueDays: 5 } }),
    prisma.protocolStep.create({ data: { id: 'psa-4', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Consulta com Urologista', type: 'consulta', orderIndex: 4, prerequisiteStepIds: ['psa-3'], branchConditions: {}, dueDays: 7 } }),
    prisma.protocolStep.create({ data: { id: 'psa-5', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Diagnóstico Médico', type: 'diagnostico', orderIndex: 5, prerequisiteStepIds: ['psa-4'], branchConditions: { cirurgico: ['psa-6b', 'psa-7b', 'psa-8b', 'psa-9b'], conservador: ['psa-6a', 'psa-7a'] }, dueDays: 3 } }),
    prisma.protocolStep.create({ data: { id: 'psa-6a', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Medicação e Hidratação', type: 'procedimento', orderIndex: 6, prerequisiteStepIds: ['psa-5'], branchConditions: {}, dueDays: 14 } }),
    prisma.protocolStep.create({ data: { id: 'psa-7a', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Retorno Conservador', type: 'retorno', orderIndex: 7, prerequisiteStepIds: ['psa-6a'], branchConditions: {}, dueDays: 30 } }),
    prisma.protocolStep.create({ data: { id: 'psa-6b', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Preparação Cirúrgica', type: 'procedimento', orderIndex: 6, prerequisiteStepIds: ['psa-5'], branchConditions: {}, dueDays: 7 } }),
    prisma.protocolStep.create({ data: { id: 'psa-7b', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Cirurgia (Litotripsia)', type: 'procedimento', orderIndex: 7, prerequisiteStepIds: ['psa-6b'], branchConditions: {}, dueDays: 14 } }),
    prisma.protocolStep.create({ data: { id: 'psa-8b', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Recuperação Pós-Cirúrgica', type: 'procedimento', orderIndex: 8, prerequisiteStepIds: ['psa-7b'], branchConditions: {}, dueDays: 7 } }),
    prisma.protocolStep.create({ data: { id: 'psa-9b', protocolId: protoColicaA.id, tenantId: tenantA.id, name: 'Retorno Cirúrgico', type: 'retorno', orderIndex: 9, prerequisiteStepIds: ['psa-8b'], branchConditions: {}, dueDays: 30 } }),
  ])

  const protoHipertensaoA = await prisma.protocol.create({
    data: { id: 'proto-hiper-a', tenantId: tenantA.id, name: 'Protocolo de Hipertensão Arterial', description: 'Acompanhamento de hipertensão arterial sistêmica' },
  })

  await Promise.all([
    prisma.protocolStep.create({ data: { id: 'psha-1', protocolId: protoHipertensaoA.id, tenantId: tenantA.id, name: 'Consulta Inicial', type: 'consulta', orderIndex: 1, prerequisiteStepIds: [], branchConditions: {}, dueDays: 1 } }),
    prisma.protocolStep.create({ data: { id: 'psha-2', protocolId: protoHipertensaoA.id, tenantId: tenantA.id, name: 'Exames de Rotina', type: 'exame', orderIndex: 2, prerequisiteStepIds: ['psha-1'], branchConditions: {}, dueDays: 7 } }),
    prisma.protocolStep.create({ data: { id: 'psha-3', protocolId: protoHipertensaoA.id, tenantId: tenantA.id, name: 'Avaliação Cardiológica', type: 'exame', orderIndex: 3, prerequisiteStepIds: ['psha-2'], branchConditions: {}, dueDays: 14 } }),
    prisma.protocolStep.create({ data: { id: 'psha-4', protocolId: protoHipertensaoA.id, tenantId: tenantA.id, name: 'Prescrição Medicamentosa', type: 'diagnostico', orderIndex: 4, prerequisiteStepIds: ['psha-3'], branchConditions: {}, dueDays: 3 } }),
    prisma.protocolStep.create({ data: { id: 'psha-5', protocolId: protoHipertensaoA.id, tenantId: tenantA.id, name: 'Ajuste de Dosagem', type: 'procedimento', orderIndex: 5, prerequisiteStepIds: ['psha-4'], branchConditions: {}, dueDays: 30 } }),
    prisma.protocolStep.create({ data: { id: 'psha-6', protocolId: protoHipertensaoA.id, tenantId: tenantA.id, name: 'Retorno Final', type: 'retorno', orderIndex: 6, prerequisiteStepIds: ['psha-5'], branchConditions: {}, dueDays: 60 } }),
  ])

  // ── Protocols for Tenant B (identical structure, different IDs) ──
  const protoColicaB = await prisma.protocol.create({
    data: { id: 'proto-colica-b', tenantId: tenantB.id, name: 'Protocolo de Cólica Renal', description: 'Fluxo completo para investigação e tratamento de cólica renal' },
  })

  await Promise.all([
    prisma.protocolStep.create({ data: { id: 'psb-1', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Triagem Inicial', type: 'consulta', orderIndex: 1, prerequisiteStepIds: [], branchConditions: {}, dueDays: 1 } }),
    prisma.protocolStep.create({ data: { id: 'psb-2', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Exame Laboratorial', type: 'exame', orderIndex: 2, prerequisiteStepIds: ['psb-1'], branchConditions: {}, dueDays: 3 } }),
    prisma.protocolStep.create({ data: { id: 'psb-3', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Exame de Imagem (USG)', type: 'exame', orderIndex: 3, prerequisiteStepIds: ['psb-2'], branchConditions: {}, dueDays: 5 } }),
    prisma.protocolStep.create({ data: { id: 'psb-4', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Consulta com Urologista', type: 'consulta', orderIndex: 4, prerequisiteStepIds: ['psb-3'], branchConditions: {}, dueDays: 7 } }),
    prisma.protocolStep.create({ data: { id: 'psb-5', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Diagnóstico Médico', type: 'diagnostico', orderIndex: 5, prerequisiteStepIds: ['psb-4'], branchConditions: { cirurgico: ['psb-6b', 'psb-7b', 'psb-8b', 'psb-9b'], conservador: ['psb-6a', 'psb-7a'] }, dueDays: 3 } }),
    prisma.protocolStep.create({ data: { id: 'psb-6a', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Medicação e Hidratação', type: 'procedimento', orderIndex: 6, prerequisiteStepIds: ['psb-5'], branchConditions: {}, dueDays: 14 } }),
    prisma.protocolStep.create({ data: { id: 'psb-7a', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Retorno Conservador', type: 'retorno', orderIndex: 7, prerequisiteStepIds: ['psb-6a'], branchConditions: {}, dueDays: 30 } }),
    prisma.protocolStep.create({ data: { id: 'psb-6b', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Preparação Cirúrgica', type: 'procedimento', orderIndex: 6, prerequisiteStepIds: ['psb-5'], branchConditions: {}, dueDays: 7 } }),
    prisma.protocolStep.create({ data: { id: 'psb-7b', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Cirurgia (Litotripsia)', type: 'procedimento', orderIndex: 7, prerequisiteStepIds: ['psb-6b'], branchConditions: {}, dueDays: 14 } }),
    prisma.protocolStep.create({ data: { id: 'psb-8b', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Recuperação Pós-Cirúrgica', type: 'procedimento', orderIndex: 8, prerequisiteStepIds: ['psb-7b'], branchConditions: {}, dueDays: 7 } }),
    prisma.protocolStep.create({ data: { id: 'psb-9b', protocolId: protoColicaB.id, tenantId: tenantB.id, name: 'Retorno Cirúrgico', type: 'retorno', orderIndex: 9, prerequisiteStepIds: ['psb-8b'], branchConditions: {}, dueDays: 30 } }),
  ])

  const protoHipertensaoB = await prisma.protocol.create({
    data: { id: 'proto-hiper-b', tenantId: tenantB.id, name: 'Protocolo de Hipertensão Arterial', description: 'Acompanhamento de hipertensão arterial sistêmica' },
  })

  await Promise.all([
    prisma.protocolStep.create({ data: { id: 'pshb-1', protocolId: protoHipertensaoB.id, tenantId: tenantB.id, name: 'Consulta Inicial', type: 'consulta', orderIndex: 1, prerequisiteStepIds: [], branchConditions: {}, dueDays: 1 } }),
    prisma.protocolStep.create({ data: { id: 'pshb-2', protocolId: protoHipertensaoB.id, tenantId: tenantB.id, name: 'Exames de Rotina', type: 'exame', orderIndex: 2, prerequisiteStepIds: ['pshb-1'], branchConditions: {}, dueDays: 7 } }),
    prisma.protocolStep.create({ data: { id: 'pshb-3', protocolId: protoHipertensaoB.id, tenantId: tenantB.id, name: 'Avaliação Cardiológica', type: 'exame', orderIndex: 3, prerequisiteStepIds: ['pshb-2'], branchConditions: {}, dueDays: 14 } }),
    prisma.protocolStep.create({ data: { id: 'pshb-4', protocolId: protoHipertensaoB.id, tenantId: tenantB.id, name: 'Prescrição Medicamentosa', type: 'diagnostico', orderIndex: 4, prerequisiteStepIds: ['pshb-3'], branchConditions: {}, dueDays: 3 } }),
    prisma.protocolStep.create({ data: { id: 'pshb-5', protocolId: protoHipertensaoB.id, tenantId: tenantB.id, name: 'Ajuste de Dosagem', type: 'procedimento', orderIndex: 5, prerequisiteStepIds: ['pshb-4'], branchConditions: {}, dueDays: 30 } }),
    prisma.protocolStep.create({ data: { id: 'pshb-6', protocolId: protoHipertensaoB.id, tenantId: tenantB.id, name: 'Retorno Final', type: 'retorno', orderIndex: 6, prerequisiteStepIds: ['pshb-5'], branchConditions: {}, dueDays: 60 } }),
  ])

  // ── Patients Tenant A ──
  const patientsANames = [
    { name: 'Carlos Eduardo Santos', cpf: '111.222.333-44', birth: '1985-03-15' },
    { name: 'Maria Aparecida Oliveira', cpf: '222.333.444-55', birth: '1972-08-21' },
    { name: 'José Roberto Silva', cpf: '333.444.555-66', birth: '1990-01-10' },
    { name: 'Ana Paula Ferreira', cpf: '444.555.666-77', birth: '1968-12-05' },
    { name: 'Lucas Henrique Souza', cpf: '555.666.777-88', birth: '1995-06-30' },
    { name: 'Beatriz Lima Rodrigues', cpf: '666.777.888-99', birth: '1982-04-18' },
    { name: 'Fernando Almeida Costa', cpf: '777.888.999-00', birth: '1978-09-22' },
    { name: 'Patrícia Mendes Araujo', cpf: '888.999.000-11', birth: '1993-11-14' },
  ]

  const patientsA = await Promise.all(
    patientsANames.map((p, i) =>
      prisma.patient.create({
        data: { id: `patient-a${i + 1}`, tenantId: tenantA.id, fullName: p.name, cpf: p.cpf, birthDate: new Date(p.birth) },
      })
    )
  )

  // ── Patients Tenant B ──
  const patientsBNames = [
    { name: 'Rafael Gonçalves Pereira', cpf: '111.111.111-11', birth: '1987-05-20' },
    { name: 'Claudia Regina Nascimento', cpf: '222.222.222-22', birth: '1975-02-14' },
    { name: 'Marcos Vinícius Barbosa', cpf: '333.333.333-33', birth: '1992-07-08' },
    { name: 'Juliana Cristina Ramos', cpf: '444.444.444-44', birth: '1980-10-25' },
    { name: 'Thiago Augusto Cardoso', cpf: '555.555.555-55', birth: '1998-03-12' },
    { name: 'Renata Soares Machado', cpf: '666.666.666-66', birth: '1970-06-01' },
    { name: 'Diego Martins Freitas', cpf: '777.777.777-77', birth: '1989-12-30' },
    { name: 'Camila Borges Teixeira', cpf: '888.888.888-88', birth: '1996-08-17' },
  ]

  const patientsB = await Promise.all(
    patientsBNames.map((p, i) =>
      prisma.patient.create({
        data: { id: `patient-b${i + 1}`, tenantId: tenantB.id, fullName: p.name, cpf: p.cpf, birthDate: new Date(p.birth) },
      })
    )
  )

  // ── Helper: build snapshot from protocol steps ──
  function buildSnapshot(protoId: string, protoName: string, steps: { id: string; name: string; type: string; orderIndex: number; prerequisiteStepIds: string[]; branchConditions: unknown; dueDays: number | null }[]) {
    return {
      id: protoId,
      name: protoName,
      steps: steps.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        orderIndex: s.orderIndex,
        prerequisiteStepIds: s.prerequisiteStepIds,
        branchConditions: s.branchConditions as Record<string, string[]>,
        dueDays: s.dueDays,
      })),
    }
  }

  const colicaSnapshotA = buildSnapshot(protoColicaA.id, protoColicaA.name, colicaStepsA)

  // ── Journeys Tenant A ──
  // Patient 1: Cólica Renal, step 1 done, step 2 pendente (early stage)
  const j1 = await prisma.patientJourney.create({
    data: {
      id: 'journey-a1', tenantId: tenantA.id, patientId: patientsA[0].id,
      protocolId: protoColicaA.id, protocolSnapshot: colicaSnapshotA,
      status: 'ativo', createdById: usersA[0].id,
      startedAt: new Date('2026-06-20'),
    },
  })
  await Promise.all([
    prisma.journeyStep.create({ data: { id: 'js-a1-1', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-1', status: 'concluido', executedAt: new Date('2026-06-20'), executedById: usersA[2].id, result: 'Paciente triado com sucesso' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-2', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-2', status: 'pendente' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-3', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-3', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-4', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-4', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-5', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-5', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-6a', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-6a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-7a', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-7a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-6b', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-6b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-7b', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-7b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-8b', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-8b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a1-9b', tenantId: tenantA.id, journeyId: j1.id, protocolStepId: 'psa-9b', status: 'bloqueado' } }),
  ])

  // Patient 2: Cólica Renal, steps 1-2 done, step 3 pendente (early stage)
  const j2 = await prisma.patientJourney.create({
    data: {
      id: 'journey-a2', tenantId: tenantA.id, patientId: patientsA[1].id,
      protocolId: protoColicaA.id, protocolSnapshot: colicaSnapshotA,
      status: 'ativo', createdById: usersA[0].id, startedAt: new Date('2026-06-18'),
    },
  })
  await Promise.all([
    prisma.journeyStep.create({ data: { id: 'js-a2-1', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-1', status: 'concluido', executedAt: new Date('2026-06-18'), executedById: usersA[2].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-2', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-2', status: 'concluido', executedAt: new Date('2026-06-19'), executedById: usersA[1].id, result: 'Creatinina elevada' } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-3', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-3', status: 'pendente' } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-4', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-4', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-5', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-5', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-6a', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-6a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-7a', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-7a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-6b', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-6b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-7b', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-7b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-8b', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-8b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a2-9b', tenantId: tenantA.id, journeyId: j2.id, protocolStepId: 'psa-9b', status: 'bloqueado' } }),
  ])

  // Patient 3: Cólica Renal, steps 1-3 done, step 4 em_andamento (mid stage)
  const j3 = await prisma.patientJourney.create({
    data: {
      id: 'journey-a3', tenantId: tenantA.id, patientId: patientsA[2].id,
      protocolId: protoColicaA.id, protocolSnapshot: colicaSnapshotA,
      status: 'ativo', createdById: usersA[1].id, startedAt: new Date('2026-06-10'),
    },
  })
  await Promise.all([
    prisma.journeyStep.create({ data: { id: 'js-a3-1', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-1', status: 'concluido', executedAt: new Date('2026-06-10'), executedById: usersA[2].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-2', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-2', status: 'concluido', executedAt: new Date('2026-06-12'), executedById: usersA[1].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-3', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-3', status: 'concluido', executedAt: new Date('2026-06-14'), executedById: usersA[1].id, result: 'Cálculo de 6mm' } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-4', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-4', status: 'em_andamento' } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-5', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-5', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-6a', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-6a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-7a', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-7a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-6b', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-6b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-7b', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-7b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-8b', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-8b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a3-9b', tenantId: tenantA.id, journeyId: j3.id, protocolStepId: 'psa-9b', status: 'bloqueado' } }),
  ])

  // Patient 4: Cólica Renal, mid stage (same as patient 3 shape but different dates)
  const j4 = await prisma.patientJourney.create({
    data: {
      id: 'journey-a4', tenantId: tenantA.id, patientId: patientsA[3].id,
      protocolId: protoColicaA.id, protocolSnapshot: colicaSnapshotA,
      status: 'ativo', createdById: usersA[0].id, startedAt: new Date('2026-06-08'),
    },
  })
  await Promise.all([
    prisma.journeyStep.create({ data: { id: 'js-a4-1', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-1', status: 'concluido', executedAt: new Date('2026-06-08'), executedById: usersA[2].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-2', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-2', status: 'concluido', executedAt: new Date('2026-06-09'), executedById: usersA[1].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-3', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-3', status: 'em_andamento' } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-4', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-4', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-5', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-5', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-6a', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-6a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-7a', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-7a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-6b', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-6b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-7b', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-7b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-8b', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-8b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a4-9b', tenantId: tenantA.id, journeyId: j4.id, protocolStepId: 'psa-9b', status: 'bloqueado' } }),
  ])

  // Patient 5: Cólica Renal, branching → cirurgico, step 6b pendente
  const j5 = await prisma.patientJourney.create({
    data: {
      id: 'journey-a5', tenantId: tenantA.id, patientId: patientsA[4].id,
      protocolId: protoColicaA.id, protocolSnapshot: colicaSnapshotA,
      status: 'ativo', createdById: usersA[1].id, startedAt: new Date('2026-06-01'),
    },
  })
  await Promise.all([
    prisma.journeyStep.create({ data: { id: 'js-a5-1', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-1', status: 'concluido', executedAt: new Date('2026-06-01'), executedById: usersA[2].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-2', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-2', status: 'concluido', executedAt: new Date('2026-06-03'), executedById: usersA[1].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-3', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-3', status: 'concluido', executedAt: new Date('2026-06-05'), executedById: usersA[1].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-4', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-4', status: 'concluido', executedAt: new Date('2026-06-07'), executedById: usersA[0].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-5', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-5', status: 'concluido', executedAt: new Date('2026-06-09'), executedById: usersA[0].id, result: 'cirurgico' } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-6a', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-6a', status: 'ignorado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-7a', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-7a', status: 'ignorado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-6b', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-6b', status: 'pendente' } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-7b', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-7b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-8b', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-8b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a5-9b', tenantId: tenantA.id, journeyId: j5.id, protocolStepId: 'psa-9b', status: 'bloqueado' } }),
  ])

  // Patient 6: Cólica Renal, branching → conservador, step 6a pendente
  const j6 = await prisma.patientJourney.create({
    data: {
      id: 'journey-a6', tenantId: tenantA.id, patientId: patientsA[5].id,
      protocolId: protoColicaA.id, protocolSnapshot: colicaSnapshotA,
      status: 'ativo', createdById: usersA[0].id, startedAt: new Date('2026-06-02'),
    },
  })
  await Promise.all([
    prisma.journeyStep.create({ data: { id: 'js-a6-1', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-1', status: 'concluido', executedAt: new Date('2026-06-02'), executedById: usersA[2].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-2', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-2', status: 'concluido', executedAt: new Date('2026-06-04'), executedById: usersA[1].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-3', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-3', status: 'concluido', executedAt: new Date('2026-06-06'), executedById: usersA[1].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-4', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-4', status: 'concluido', executedAt: new Date('2026-06-08'), executedById: usersA[0].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-5', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-5', status: 'concluido', executedAt: new Date('2026-06-10'), executedById: usersA[0].id, result: 'conservador' } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-6a', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-6a', status: 'pendente' } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-7a', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-7a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-6b', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-6b', status: 'ignorado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-7b', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-7b', status: 'ignorado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-8b', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-8b', status: 'ignorado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a6-9b', tenantId: tenantA.id, journeyId: j6.id, protocolStepId: 'psa-9b', status: 'ignorado' } }),
  ])

  // Patient 7: Cólica Renal, all complete (conservador branch, 100%)
  const j7 = await prisma.patientJourney.create({
    data: {
      id: 'journey-a7', tenantId: tenantA.id, patientId: patientsA[6].id,
      protocolId: protoColicaA.id, protocolSnapshot: colicaSnapshotA,
      status: 'concluido', createdById: usersA[0].id, startedAt: new Date('2026-05-01'),
      completedAt: new Date('2026-06-15'),
    },
  })
  await Promise.all([
    prisma.journeyStep.create({ data: { id: 'js-a7-1', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-1', status: 'concluido', executedAt: new Date('2026-05-01'), executedById: usersA[2].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-2', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-2', status: 'concluido', executedAt: new Date('2026-05-03'), executedById: usersA[1].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-3', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-3', status: 'concluido', executedAt: new Date('2026-05-06'), executedById: usersA[1].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-4', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-4', status: 'concluido', executedAt: new Date('2026-05-10'), executedById: usersA[0].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-5', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-5', status: 'concluido', executedAt: new Date('2026-05-12'), executedById: usersA[0].id, result: 'conservador' } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-6a', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-6a', status: 'concluido', executedAt: new Date('2026-05-20'), executedById: usersA[1].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-7a', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-7a', status: 'concluido', executedAt: new Date('2026-06-15'), executedById: usersA[0].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-6b', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-6b', status: 'ignorado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-7b', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-7b', status: 'ignorado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-8b', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-8b', status: 'ignorado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a7-9b', tenantId: tenantA.id, journeyId: j7.id, protocolStepId: 'psa-9b', status: 'ignorado' } }),
  ])

  // Patient 8: Cólica Renal, suspenso
  const j8 = await prisma.patientJourney.create({
    data: {
      id: 'journey-a8', tenantId: tenantA.id, patientId: patientsA[7].id,
      protocolId: protoColicaA.id, protocolSnapshot: colicaSnapshotA,
      status: 'suspenso', createdById: usersA[0].id, startedAt: new Date('2026-06-15'),
    },
  })
  await Promise.all([
    prisma.journeyStep.create({ data: { id: 'js-a8-1', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-1', status: 'concluido', executedAt: new Date('2026-06-15'), executedById: usersA[2].id } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-2', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-2', status: 'pendente' } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-3', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-3', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-4', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-4', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-5', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-5', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-6a', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-6a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-7a', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-7a', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-6b', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-6b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-7b', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-7b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-8b', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-8b', status: 'bloqueado' } }),
    prisma.journeyStep.create({ data: { id: 'js-a8-9b', tenantId: tenantA.id, journeyId: j8.id, protocolStepId: 'psa-9b', status: 'bloqueado' } }),
  ])

  // ── Minimal journeys for Tenant B (abbreviated for brevity) ──
  const colicaStepsB = await prisma.protocolStep.findMany({ where: { protocolId: protoColicaB.id }, orderBy: { orderIndex: 'asc' } })
  const colicaSnapshotB = buildSnapshot(protoColicaB.id, protoColicaB.name, colicaStepsB as Parameters<typeof buildSnapshot>[2])

  for (let i = 0; i < patientsB.length; i++) {
    const statuses = ['ativo', 'ativo', 'ativo', 'ativo', 'ativo', 'ativo', 'concluido', 'suspenso'] as const
    const journeyStatus = statuses[i]
    const jId = `journey-b${i + 1}`

    const j = await prisma.patientJourney.create({
      data: {
        id: jId, tenantId: tenantB.id, patientId: patientsB[i].id,
        protocolId: protoColicaB.id, protocolSnapshot: colicaSnapshotB,
        status: journeyStatus, createdById: usersB[0].id,
        startedAt: new Date(`2026-06-${String(1 + i * 2).padStart(2, '0')}`),
        completedAt: journeyStatus === 'concluido' ? new Date('2026-06-24') : null,
      },
    })

    const stepStatuses = i < 2
      ? ['concluido', 'pendente', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado']
      : i < 4
        ? ['concluido', 'concluido', 'em_andamento', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado']
        : i === 4
          ? ['concluido', 'concluido', 'concluido', 'concluido', 'concluido', 'ignorado', 'ignorado', 'pendente', 'bloqueado', 'bloqueado', 'bloqueado']
          : i === 5
            ? ['concluido', 'concluido', 'concluido', 'concluido', 'concluido', 'pendente', 'bloqueado', 'ignorado', 'ignorado', 'ignorado', 'ignorado']
            : i === 6
              ? ['concluido', 'concluido', 'concluido', 'concluido', 'concluido', 'concluido', 'concluido', 'ignorado', 'ignorado', 'ignorado', 'ignorado']
              : ['concluido', 'pendente', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado', 'bloqueado']

    const bStepIds = ['psb-1', 'psb-2', 'psb-3', 'psb-4', 'psb-5', 'psb-6a', 'psb-7a', 'psb-6b', 'psb-7b', 'psb-8b', 'psb-9b']

    await Promise.all(
      bStepIds.map((psId, si) =>
        prisma.journeyStep.create({
          data: {
            id: `js-b${i + 1}-${si + 1}`,
            tenantId: tenantB.id,
            journeyId: j.id,
            protocolStepId: psId,
            status: stepStatuses[si],
            executedAt: stepStatuses[si] === 'concluido' ? new Date(`2026-06-${String(1 + i * 2 + si).padStart(2, '0')}`) : null,
            executedById: stepStatuses[si] === 'concluido' ? usersB[si % 2 === 0 ? 0 : 1].id : null,
            result: psId.endsWith('-5') && stepStatuses[si] === 'concluido'
              ? (i === 4 ? 'cirurgico' : i === 5 || i === 6 ? 'conservador' : null)
              : null,
          },
        })
      )
    )
  }

  console.log('Seed completed successfully.')
  console.log(`  Tenants: 2`)
  console.log(`  Users: 6`)
  console.log(`  Protocols: 4`)
  console.log(`  Patients: 16`)
  console.log(`  Journeys: 16`)
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
