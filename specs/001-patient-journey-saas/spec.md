# Feature Specification: Plataforma SaaS de Gestão de Jornada Clínica do Paciente

**Feature Branch**: `001-patient-journey-saas`

**Created**: 2026-06-26

**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Profissional visualiza e avança a jornada de um paciente (Priority: P1)

Um médico ou recepcionista acessa a jornada de um paciente específico e vê todas as
etapas do protocolo clínico atribuído: quais estão concluídas, qual está em andamento,
quais estão bloqueadas e qual é o próximo passo esperado. Ele então registra a conclusão
de uma etapa (com resultado quando aplicável), e o sistema automaticamente desbloqueia
as etapas seguintes conforme as regras do protocolo.

**Why this priority**: É o fluxo central do produto — sem ele, o sistema não entrega
nenhum valor clínico. Todas as outras histórias dependem deste fluxo funcionar.

**Independent Test**: Pode ser testado de forma isolada criando um paciente com uma
jornada ativa e verificando se o profissional consegue visualizar o estado atual e
registrar a conclusão de uma etapa, observando que a próxima etapa é desbloqueada.

**Acceptance Scenarios**:

1. **Given** um paciente com jornada ativa no Protocolo de Cólica Renal na etapa
   "Exame Laboratorial" (etapa 2), **When** o profissional acessa a tela de Jornada
   do Paciente, **Then** ele vê a etapa 1 como "concluída", a etapa 2 como "em
   andamento", as etapas 3–9 como "bloqueadas", e o próximo passo destacado é
   "Exame Laboratorial".

2. **Given** a etapa "Diagnóstico Médico" está em andamento e o profissional registra
   o resultado "cirúrgico", **When** a etapa é marcada como concluída, **Then** as
   etapas do ramo conservador (6A, 7A) ficam como "ignoradas" e as etapas do ramo
   cirúrgico (6B, 7B, 8B, 9B) ficam desbloqueadas sequencialmente conforme seus
   pré-requisitos.

3. **Given** todas as etapas relevantes de uma jornada foram concluídas, **When** o
   profissional visualiza a jornada, **Then** o status geral é "concluída" e o
   progresso exibe 100%.

---

### User Story 2 — Profissional acessa o Dashboard e lista de pacientes (Priority: P2)

Ao fazer login, o profissional é direcionado para o Dashboard do seu tenant, onde vê
métricas consolidadas: total de pacientes, jornadas ativas, jornadas atrasadas e
próximos retornos agendados. A partir do Dashboard ou da Lista de Pacientes, ele
localiza rapidamente um paciente e acessa sua jornada.

**Why this priority**: É o ponto de entrada operacional diário. Sem o dashboard e a
lista, o profissional não consegue identificar rapidamente quais pacientes precisam
de atenção.

**Independent Test**: Pode ser testado acessando o dashboard com dados do seed e
verificando que os contadores refletem os dados reais, e que a navegação até um
paciente funciona.

**Acceptance Scenarios**:

1. **Given** o tenant "Clínica São Lucas" tem 8 pacientes, 5 jornadas ativas e 2
   atrasadas, **When** o profissional acessa o Dashboard, **Then** os cards exibem
   "8 pacientes", "5 jornadas ativas", "2 jornadas atrasadas".

2. **Given** o profissional está na Lista de Pacientes, **When** ele filtra por nome
   ou protocolo, **Then** a tabela exibe apenas os pacientes correspondentes com:
   nome, protocolo ativo, etapa atual, status e data da última atualização.

3. **Given** o profissional clica em um paciente na Lista, **When** a navegação ocorre,
   **Then** ele é direcionado para a tela de Jornada do Paciente daquele paciente
   (User Story 1).

---

### User Story 3 — Admin configura protocolos clínicos do tenant (Priority: P3)

O administrador do tenant acessa a Gestão de Protocolos e cria ou edita um protocolo
clínico, definindo etapas com seus tipos, pré-requisitos e condições de ramificação.
As mudanças no protocolo afetam apenas novas jornadas atribuídas — jornadas já em
andamento não são alteradas retroativamente.

**Why this priority**: Sem essa funcionalidade, os protocolos precisariam ser
configurados manualmente no banco de dados — viável no seed, mas não escalável para
uso real do produto.

**Independent Test**: Pode ser testado criando um novo protocolo simples com 3 etapas
sequenciais via interface, atribuindo-o a um paciente e verificando que a jornada
criada reflete o protocolo configurado.

**Acceptance Scenarios**:

1. **Given** o admin acessa "Gestão de Protocolos" e clica em "Novo Protocolo",
   **When** ele preenche nome, descrição e adiciona 3 etapas com pré-requisitos,
   **Then** o protocolo é salvo e listado na tela de Gestão de Protocolos do tenant.

2. **Given** um protocolo existente com 5 etapas, **When** o admin adiciona uma etapa
   condicional com ramificação, **Then** a nova configuração é salva e novas jornadas
   criadas com este protocolo refletem a nova estrutura, sem alterar jornadas existentes.

3. **Given** o admin tenta excluir um protocolo que possui jornadas ativas, **When**
   a exclusão é solicitada, **Then** o sistema bloqueia a operação e exibe mensagem
   explicando que o protocolo está em uso.

---

### User Story 4 — Autenticação e isolamento por tenant (Priority: P1)

Um profissional acessa a plataforma via login (e-mail e senha). O sistema identifica
o tenant ao qual ele pertence e redireciona para o workspace correto. Toda a interface
e os dados exibidos pertencem exclusivamente ao tenant do profissional — dados de
outros tenants são completamente inacessíveis.

**Why this priority**: Segurança multi-tenant é um requisito não-negociável definido
na constituição. Sem isolamento correto, o produto não pode ser lançado.

**Independent Test**: Pode ser testado fazendo login com credenciais de dois tenants
diferentes e verificando que cada sessão exibe apenas os dados do seu respectivo tenant.

**Acceptance Scenarios**:

1. **Given** um profissional com credenciais válidas do tenant "Clínica São Lucas",
   **When** ele faz login, **Then** é redirecionado para o workspace da Clínica São
   Lucas e vê apenas pacientes e protocolos deste tenant.

2. **Given** um profissional autenticado no tenant A, **When** ele tenta acessar
   diretamente por URL um recurso do tenant B (ex: `/api/v1/patients/{id_do_tenant_B}`),
   **Then** o sistema retorna HTTP 403 ou 404 sem expor nenhum dado do tenant B.

3. **Given** um usuário sem autenticação, **When** ele tenta acessar qualquer rota
   protegida, **Then** é redirecionado para a tela de Login.

---

### Edge Cases

- O que acontece quando um paciente é atribuído a um protocolo e depois o protocolo
  é editado? A jornada existente deve permanecer com a versão do protocolo no momento
  da atribuição.
- O que acontece quando uma etapa condicional recebe um resultado não previsto nas
  ramificações configuradas? O sistema deve registrar o resultado e não avançar
  nenhuma ramificação, sinalizando ao profissional para revisão.
- O que acontece quando dois profissionais tentam concluir a mesma JourneyStep
  simultaneamente? A primeira operação grava com sucesso. A segunda recebe erro
  informativo: "Etapa já concluída por [Nome do profissional] em [data/hora]." A tela
  do segundo profissional é atualizada automaticamente para refletir o estado atual.
- O que acontece quando o profissional tenta concluir uma etapa que ainda está
  bloqueada (pré-requisitos não satisfeitos)? A ação deve ser bloqueada com mensagem
  clara sobre qual etapa precisa ser concluída primeiro.
- O que acontece com uma jornada suspensa? Etapas não podem ser avançadas; o status
  "suspenso" é visível na interface; apenas um admin pode reativar (ativo) ou cancelar.
- O que acontece quando um admin cancela uma jornada? O cancelamento é irreversível.
  Se o paciente precisar retomar o protocolo, o admin cria uma nova jornada. A jornada
  cancelada permanece visível no histórico do paciente como somente-leitura.
- O que acontece com jornadas atrasadas? Consideram-se atrasadas jornadas onde a
  etapa atual está pendente/em andamento há mais tempo do que o prazo configurado
  na etapa (campo opcional no ProtocolStep).

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema MUST autenticar profissionais via e-mail e senha e redirecionar
  para o workspace do tenant correto após login bem-sucedido.
- **FR-002**: O sistema MUST isolar completamente os dados entre tenants — nenhum usuário
  pode acessar, visualizar ou modificar dados de um tenant ao qual não pertence.
- **FR-003**: O sistema MUST exibir no Dashboard: total de pacientes, número de jornadas
  ativas, número de jornadas atrasadas e lista dos próximos retornos agendados.
- **FR-004**: O sistema MUST exibir uma Lista de Pacientes com colunas: nome, protocolo
  ativo, etapa atual, status da jornada, data da última atualização e ações de navegação.
- **FR-005**: O sistema MUST exibir a Jornada do Paciente com todas as etapas do protocolo
  em ordem para qualquer profissional autenticado do tenant, independente do seu role. O
  status visual de cada etapa (bloqueado/pendente/em andamento/concluído/ignorado),
  ramificações visíveis e o próximo passo destacado MUST ser visíveis a todos. O botão
  de registro de conclusão MUST estar desabilitado para etapas fora da competência do
  role do profissional, com tooltip explicando o motivo.
- **FR-006**: O sistema MUST permitir que um profissional registre a conclusão de uma etapa,
  incluindo: responsável, data/hora, resultado (quando aplicável) e observações. Se a etapa
  já tiver sido concluída por outro profissional, o sistema MUST rejeitar a operação com
  mensagem identificando quem concluiu e quando, e atualizar a tela com o estado atual.
- **FR-007**: Após o registro de conclusão de uma etapa, o sistema MUST calcular automaticamente
  quais etapas são desbloqueadas com base nos pré-requisitos e nas condições de ramificação
  do protocolo.
- **FR-008**: O sistema MUST calcular e exibir o percentual de progresso da jornada do paciente.
- **FR-009**: O sistema MUST exibir os detalhes de execução de uma etapa (responsável, data,
  resultado, observações) em um modal ou drawer ao clicar na etapa.
- **FR-010**: Administradores do tenant MUST poder criar, visualizar e editar protocolos
  clínicos, incluindo etapas com tipo, pré-requisitos e condições de ramificação.
- **FR-011**: O sistema MUST impedir a exclusão de um protocolo que possua jornadas ativas
  ou em andamento.
- **FR-012**: Ao criar uma PatientJourney, o sistema MUST capturar e armazenar um snapshot
  imutável do protocolo completo (estrutura de etapas, pré-requisitos e ramificações) no
  momento da atribuição. Edições posteriores ao Protocol de origem NÃO DEVEM alterar
  jornadas existentes — cada jornada opera sobre seu próprio snapshot.
- **FR-013**: O sistema MUST impedir que um profissional conclua uma etapa com pré-requisitos
  não satisfeitos, exibindo mensagem clara sobre a dependência.
- **FR-014**: O sistema MUST suportar os seguintes status de etapa: bloqueado, pendente,
  em andamento, concluído, ignorado.
- **FR-015**: O sistema MUST suportar os seguintes status de jornada: ativo, concluído,
  suspenso, cancelado. As transições permitidas são: ativo → suspenso (admin),
  suspenso → ativo (admin), ativo → cancelado (admin), suspenso → cancelado (admin).
  O status "cancelado" é irreversível — uma jornada cancelada não pode ser reaberta.
  A conclusão (status "concluído") é calculada automaticamente pelo sistema quando
  todas as etapas relevantes da jornada são concluídas.
- **FR-016**: O sistema MUST distinguir visualmente jornadas atrasadas das ativas no
  Dashboard e na Lista de Pacientes.
- **FR-017**: No cadastro do Patient, o sistema MUST registrar a base legal para
  tratamento dos dados sensíveis de saúde (ex: "tratamento de saúde — art. 11, II,
  f, LGPD"). Este campo é obrigatório e deve ser pré-preenchido com o valor padrão
  aplicável a todos os tenants.
- **FR-018**: O sistema MUST registrar um log de acesso a dados sensíveis do paciente
  (DataAccessLog) sempre que um profissional visualizar ou modificar dados de um Patient
  ou JourneyStep. O log MUST conter: tenant_id, user_id, patient_id, ação realizada,
  timestamp. Logs são imutáveis — nenhum profissional pode excluí-los pela interface.

### Key Entities

- **Tenant**: Representa uma clínica ou hospital. Possui nome, slug único (usado em URLs),
  plano de assinatura e configurações. É o escopo de isolamento de todos os dados.
- **User**: Profissional de saúde vinculado a um tenant. Possui e-mail, senha (via Auth),
  nome e role (admin, médico, recepcionista, enfermeiro). Role determina permissões.
- **Patient**: Paciente vinculado a um tenant. Possui nome completo, CPF, data de nascimento
  e dados de contato. Pode ter múltiplas jornadas ao longo do tempo.
- **Protocol**: Definição reutilizável de um fluxo clínico pertencente a um tenant. Composto
  por ProtocolSteps. Uma vez com jornadas ativas, só pode ser editado com restrições.
- **ProtocolStep**: Etapa individual de um Protocol. Possui tipo (consulta, exame, diagnóstico,
  procedimento, retorno), pré-requisitos (lista de IDs de etapas que devem estar concluídas
  antes), e condições de ramificação (mapeamento de resultado → próximas etapas habilitadas).
- **PatientJourney**: Instância de um Protocol atribuída a um Patient. Possui data de início,
  status geral e um snapshot imutável do protocolo completo (estrutura JSON) capturado no
  momento da atribuição. O snapshot garante que a jornada nunca é afetada por edições
  posteriores ao Protocol de origem.
- **JourneyStep**: Instância de um ProtocolStep dentro de uma PatientJourney. Possui status
  (bloqueado, pendente, em andamento, concluído, ignorado), data de execução, User responsável
  e resultado registrado.
- **DataAccessLog**: Registro imutável de acesso ou modificação a dados sensíveis de Patient
  ou JourneyStep. Contém tenant_id, user_id, patient_id, ação e timestamp. Atende ao mínimo
  operacional de LGPD para tratamento de dados de saúde.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um profissional consegue localizar um paciente e acessar sua jornada completa
  em no máximo 3 cliques a partir do Login.
- **SC-002**: Após registrar a conclusão de uma etapa, o desbloqueio das próximas etapas
  é refletido na tela em menos de 2 segundos.
- **SC-003**: O seed de dados permite demonstrar o produto completo (todas as telas com
  dados realistas) sem nenhuma entrada manual de dados.
- **SC-004**: 100% das ações que envolvem dados de pacientes são restritas ao tenant do
  usuário autenticado — verificável por testes de acesso cruzado entre tenants.
- **SC-005**: Um administrador consegue criar um protocolo completo com ramificações em
  menos de 10 minutos usando apenas a interface.
- **SC-006**: O progresso percentual da jornada é calculado corretamente para jornadas
  lineares e para jornadas com ramificações (considera apenas as etapas do ramo ativo).

---

## Clarifications

### Session 2026-06-26

- Q: Qual é o nível de conformidade com LGPD exigido no MVP? → A: Mínimo operacional —
  base legal registrada no cadastro do paciente + log imutável de quem acessou ou
  modificou dados sensíveis (DataAccessLog), sem gestão ativa de consentimento.
- Q: Como a versão do protocolo é preservada no momento de criar uma PatientJourney? →
  A: Snapshot imutável — cópia do JSON completo do protocolo armazenada dentro da
  PatientJourney no momento da atribuição, desacoplada de edições futuras.
- Q: Como funcionam as transições de status da PatientJourney? → A: Suspender,
  reativar e cancelar são ações restritas a admin. Cancelamento é irreversível —
  uma jornada cancelada não pode ser reaberta, mas uma nova jornada pode ser criada
  para o mesmo paciente com o mesmo protocolo.
- Q: O que acontece quando dois profissionais tentam concluir a mesma JourneyStep
  simultaneamente? → A: Primeiro a gravar vence. A segunda operação recebe erro
  "etapa já concluída por [Nome] em [hora]" e a tela é atualizada com o estado atual.
- Q: O sistema deve exibir ou ocultar etapas que o profissional não tem permissão
  de registrar? → A: Exibir todas as etapas (visibilidade total do fluxo clínico),
  mas desabilitar o botão de conclusão nas etapas fora da competência do role, com
  tooltip explicando o motivo ("Apenas médicos podem registrar esta etapa").

---

## Assumptions

- O CPF é usado como identificador único do paciente dentro do tenant, mas a validação
  de formato é suficiente — integração com receita federal está fora de escopo.
- A notificação automática de profissionais (e-mail, SMS, push) para etapas vencidas
  está fora do escopo do MVP; o dashboard exibe jornadas atrasadas visualmente.
- O agendamento e integração com calendário estão fora do escopo do MVP; datas de
  execução são inseridas manualmente pelo profissional no momento do registro.
- Multiidioma está fora do escopo; o produto é em português brasileiro.
- Conformidade com LGPD no MVP é o mínimo operacional: base legal pré-configurada
  no cadastro do paciente e DataAccessLog imutável. Gestão ativa de consentimento,
  direito ao esquecimento e portabilidade de dados estão fora do escopo do MVP.
- A exportação de relatórios (PDF, CSV) está fora do escopo do MVP.
- A atribuição de um protocolo a um paciente (criação do PatientJourney) é feita
  manualmente por um profissional com role admin ou médico.
- O campo "resultado" de uma JourneyStep é texto livre quando o tipo da etapa não for
  "diagnóstico"; para diagnóstico, o resultado deve ser uma das opções configuradas nas
  condições de ramificação do ProtocolStep correspondente.
- Jornadas são consideradas "atrasadas" quando a etapa atual está no status
  "pendente" ou "em andamento" há mais dias do que o prazo opcional configurado
  no ProtocolStep; sem prazo configurado, não é possível calcular atraso para aquela etapa.
- Roles de acesso: admin pode fazer tudo; médico pode registrar etapas e criar jornadas;
  recepcionista pode visualizar e registrar etapas de consulta/retorno; enfermeiro pode
  registrar etapas de procedimento e exame. Gestão de protocolos é restrita a admin.
  Todos os roles podem visualizar a jornada completa do paciente — o enforcement de role
  ocorre apenas no botão de conclusão de cada etapa (desabilitado com tooltip explicativo).
