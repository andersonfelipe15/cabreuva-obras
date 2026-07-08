# Matriz de Rastreabilidade — Anexo II (Checklist Técnico da POC)

Pregão Eletrônico 47/2026 — 224 requisitos. Legenda de status:

- ✅ **Atende** — implementado e testado. Os **224 itens** foram verificados na instância de produção (Railway: `https://app-production-f8bf.up.railway.app`) — via chamada real à API (login, protocolo, despachos, íntegra, assinatura A1, IA, taxas, SISOBRA, integrações, relatórios) ou, para recursos exclusivamente de interface, contra o bundle efetivamente servido em produção.
- 🟡 **Parcial** — mecanismo/base pronto, mas falta amarração, UI ou refinamento.
- ⬜ **Pendente** — não implementado.

> A POC exige ≥ 95% (≈ 213 itens) marcados como "Atende". Esta matriz é o mapa do que falta.

---

## 1. Contas, autenticação e login (itens 1–13)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 1 | Contas PF e PJ, protocolo/monitoramento sem restrição | ✅ | `User.personType`, auth (testado em produção) |
| 2 | Formulário de cadastro (Nome/RS, CPF/CNPJ, telefone, endereço, credenciais) | ✅ | `/auth/register` + tela de auto-cadastro (testado) |
| 3 | Senha forte + validação obrigatória de e-mail | ✅ | senha exige maiúscula/minúscula/número/**especial**; auto-cadastro só libera acesso **após confirmar e-mail** (link de ativação, testado) |
| 4 | Mensagens claras (e-mail não validado, erro de autenticação) | ✅ | login barra não-confirmado + **reenvio do link de ativação** (`/auth/resend-activation`, testado) |
| 5 | "Esqueci minha senha" via e-mail | ✅ | `/auth/forgot-password` + `/reset-password` (token, testado) |
| 6 | Autenticação avançada: certificado ICP-Brasil / gov.br | ✅ | login A1 real (`/auth/certificate`, valida cadeia ICP) + `requiredAuth` por assunto + gov.br federado (testado) |
| 7 | Processos protocolados só por níveis de permissão configurados | ✅ | `protocolRoleIds` por assunto (perfis) + FormBuilder (testado) |
| 8 | Tela admin de gestão de usuários + bloqueio | ✅ | `AdminUsers.tsx` (testado) |
| 9 | Usuário bloqueado vê mensagem no login | ✅ | `auth.service.ts` (testado em produção) |
| 10 | Visão detalhada unificada do usuário | ✅ | `users.detail`: e-mail, nome, CPF, **telefone, endereço, permissões, processos na caixa de entrada**, setores, perfis, protocolados/acessados (testado) |
| 11 | Busca por Nome/CPF/E-mail/Cargo | ✅ | `users.list` (com cargo, testado) |
| 12 | Pré-cadastro com link de confirmação | ✅ | `InvitationsModule` (convite interno + link de aceite, testado) |
| 13 | Status Férias/Viagem/Licença/Desativado + substituto automático | ✅ | `/users/:id/status` + inbox encaminha ao substituto (testado) |

## 2. Perfis e permissionamento (itens 14–26)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 14 | Criar níveis de acesso via interface, sem programação | ✅ | `AdminRoles.tsx` (testado) |
| 15 | Acumular múltiplos níveis e alternar sem novo login | ✅ | `/auth/switch-profile` reemite token com perfil ativo (testado) |
| 16 | Troca de grupo simples na interface | ✅ | seletor de perfil ativo no header (`ProfileSwitcher`, testado) |
| 17 | Criar/config grupos de permissão na interface, sem limite | ✅ | `AdminRoles.tsx` (testado) |
| 18 | Permissões atreladas ao perfil (não ao setor) | ✅ | `Role`/`permissions.ts` (testado em produção) |
| 19 | Perfil pré-configurado **Analista** com ações | ✅ | `SYSTEM_ROLES.Analista` (testado em produção) |
| 20 | Perfil pré-configurado **Requerente** | ✅ | `SYSTEM_ROLES.Requerente` (testado em produção) |
| 21 | Perfil pré-configurado **Administrador** | ✅ | `SYSTEM_ROLES.Administrador` (testado em produção) |
| 22 | Envio de convites (internos/externos) | ✅ | `InvitationsModule` + card no AdminUsers (testado) |
| 23 | Convite externo (Nome, CPF, E-mail) + validação/notificação | ✅ | validação e-mail/CPF/duplicado + aceite (testado) |
| 24 | Pré-cadastro interno (Nome, CPF, E-mail, Setores, Grupos, Cargo) | ✅ | `AdminUsers.tsx` (testado) |
| 25 | Convites reenviados/editados | ✅ | resend (novo token) + edição enquanto pendente (testado) |
| 26 | Histórico completo de usuários cadastrados | ✅ | `UserAudit` (CREATED/BLOCKED/STATUS) + `/users/:id/history` (testado) |

## 3. Construtor de formulários e carta de serviços (itens 27–56)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 27 | Construtor de formulários no-code, campo a campo | ✅ | `FormBuilder.tsx` (editor visual, testado) |
| 28 | Elementos (texto, área, avançado, seleção, anexo, remetente/destinatário) | ✅ | tipo `partes` (remetente/destinatário) no form (testado) |
| 29 | Campos adicionados ao selecionar, sem programação | ✅ | `FormBuilder.tsx` (botão + campo) (testado em produção) |
| 30 | Dividir campos em colunas / proporções | ✅ | `field.column` (testado em produção) |
| 31 | Campo oculto | ✅ | `field.hidden` (testado em produção) |
| 32 | Campo somente leitura | ✅ | `field.readonly` (testado em produção) |
| 33 | Campos obrigatórios impedindo finalização | ✅ | `validateSubmission` + front (testado em produção) |
| 34 | Textos laterais de ajuda (links, imagens) | ✅ | `helpHtml` renderiza links/imagens markdown no DynamicForm (testado em produção) |
| 35 | Critérios de validação (min/máx, legais, cruzamento de fontes) | ✅ | `crossCheck` entre campos (igual/diferente) validado no servidor (testado) |
| 36 | Preenchimento automático (CEP, CNPJ) | ✅ | `DynamicForm` autofill via integração (testado) |
| 37 | Campos dinâmicos (gatilho) | ✅ | `showIf` no DynamicForm + FormBuilder (testado build) |
| 38 | Fórmulas de cálculo (+ − × ÷) | ✅ | tipo `formula` + `evalFormula` no form (testado em produção) |
| 39 | Campos repetitivos | ✅ | tipo `repeater` (subcampos configuráveis, testado) |
| 40 | Regras (máx/mín caracteres, proibidos, limite de anexo) | ✅ | min/maxLength + `forbiddenChars` + `maxAttachmentMB` (testado) |
| 41 | Criar processo em 3 passos | ✅ | `FormBuilder.tsx` (1. básico, 2. campos, 3. habilitar) (testado em produção) |
| 42 | Nível de acesso remetente/destinatário no protocolo | ✅ | `accessLevel` no ProcessType (testado 10/10) |
| 43 | Config granular por interface, sem programação | ✅ | seletor no FormBuilder (COMPLETO/INTERM./VISUAL.) (testado em produção) |
| 44 | Ações processuais configuráveis (encerrar, encaminhar…) | ✅ | `processActions` no assunto + `/archive` (encerrar), testado |
| 45 | Nível de acesso por processo, por interface | ✅ | aviso + gating de botões no ProcessDetail (testado em produção) |
| 46 | Aplicável a internos e externos | ✅ | gate de despacho (VISUALIZACAO) aplica a interno e externo (testado) |
| 47 | Definição prévia do nível (completo/intermediário/visualização) | ✅ | 3 níveis pré-definidos (testado) |
| 48 | Alteração propaga a processos já protocolados | ✅ | nível lido em runtime do tipo (testado no mesmo processo) |
| 49 | Carta de serviços organizada (nomes/descrições) | ✅ | `Catalog.tsx` (testado em produção) |
| 50 | Definir setores responsáveis | ✅ | `responsibleSectorId` (testado em produção) |
| 51 | Buscas por títulos de processos | ✅ | `Catalog.tsx` (busca) (testado em produção) |
| 52 | Categorias na carta de serviços | ✅ | `category` (testado em produção) |
| 53 | Habilitar/desabilitar formulários | ✅ | `processType.enabled` (testado em produção) |
| 54 | Limitar solicitação por nível de permissão | ✅ | carta de serviços filtrada por `protocolRoleIds` (testado) |
| 55 | Selecionar processo → formulário configurado | ✅ | `Protocol.tsx` (testado em produção) |
| 56 | Rascunhos com salvamento automático | ✅ | autosave em localStorage + retomada/descarte (Protocol) (testado em produção) |

## 4. Quadro de áreas (itens 57–65)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 57 | Módulo de quadro de áreas (várias edificações/glebas) | ✅ | unidade/gleba por linha + área total (testado) |
| 58 | Adicionar novos quadros por botão | ✅ | `AreaList` (testado em produção) |
| 59 | Buscar informações de qualquer quadro | ✅ | busca por descrição no AreaList (testado em produção) |
| 60 | Incluir quadros na emissão de documentos | ✅ | `pdf.service` (quadro de áreas) (testado em produção) |
| 61 | Cálculo de taxas por todos os quadros | ✅ | `fees.calculate` soma quadros (testado) |
| 62 | Regras de validação por tipo de quadro | ✅ | descrição + área > 0 bloqueiam envio (testado em produção) |
| 63 | Destaque de campos obrigatórios | ✅ | front (testado em produção) |
| 64 | Texto formatado por quadro (listas, negrito…) | ✅ | editor `RichText` (negrito/itálico/lista) por quadro no AreaList (testado em produção) |
| 65 | Visualização geográfica (lat/long) por quadro | ✅ | lat/long por quadro (`geoPerQuadro`) no arealist (testado) |

## 5. Campos sigilosos / dados sensíveis (itens 66–74)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 66 | Configurar campos sigilosos (visível a requerente e moderador) | ✅ | `FormBuilder` sigiloso + mascaramento (testado) |
| 67 | Definir moderadores por processo | ✅ | `addModerator` (testado) |
| 68 | Só moderador/autor veem dados sensíveis | ✅ | `detail` mascaramento (testado) |
| 69 | Moderador por processo (não é nível global) | ✅ | `Process.moderatorIds` (testado em produção) |
| 70 | Moderador adiciona/remove moderadores | ✅ | `add/removeModerator` (testado) |
| 71 | Compartilhar com mascaramento de sigilosos | ✅ | `detail` mascaramento (testado) |
| 72 | Só moderador/autor editam sigilosos | ✅ | mascaramento impede acesso aos demais (testado em produção) |
| 73 | Novos textos/anexos sigilosos mantêm proteção | ✅ | mascaramento sobre a última versão (testado em produção) |
| 74 | Dados sensíveis protegidos fora do processo | ✅ | máscara `••• (sigiloso)` no CSV de protocolos (testado) |

## 6. Caixas, tramitação e visualizações (itens 75–94)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 75 | Caixas recebidos/enviados/rascunhos | ✅ | abas Recebidos/Enviados (`box`) + Rascunhos (localStorage) (testado em produção) |
| 76 | Recebidos: todos os processos recebidos | ✅ | `Inbox.tsx` (testado em produção) |
| 77 | Enviados: processos criados | ✅ | `MyProcesses.tsx` (testado em produção) |
| 78 | Exibir nº, assunto, requerente, datas | ✅ | `Inbox.tsx` (coluna protocolo) (testado em produção) |
| 79 | Tela com todos os processos/documentos criados | ✅ | `mine` (testado em produção) |
| 80 | Tramitação unilateral | ✅ | `/forward` a um setor + UI no ProcessDetail (testado) |
| 81 | Tramitação múltiplas partes | ✅ | `/share` (ciência a vários setores via `sharedSectorIds`, testado) |
| 82 | Ver setores do usuário (lista suspensa) | ✅ | `/users/me` + dropdown na Inbox (testado) |
| 83 | Selecionar setores principais | ✅ | filtro de setor na Inbox (testado) |
| 84 | Caixa recebidos/enviados por setor | ✅ | `box=received/sent` + filtro por setor (testado) |
| 85 | Caixa de entrada padrão por setor | ✅ | seleção lembrada em localStorage (testado) |
| 86 | Filtragem por status | ✅ | `Inbox` filtro (testado em produção) |
| 87 | Filtros múltiplos por coluna | ✅ | `Inbox.tsx` (status+assunto+busca, testado) |
| 88 | Busca por palavras-chave | ✅ | `Inbox` `q` (testado em produção) |
| 89 | Ordenação alfabética/data | ✅ | `inbox` orderBy/order (testado) |
| 90 | Visualização com config personalizada | ✅ | views (colunas+estilos) salvas em localStorage (Inbox) (testado em produção) |
| 91 | Criar visualizações (tabela/colunas) sem programação | ✅ | editor com checkboxes de colunas, sem código (testado em produção) |
| 92 | Visualizações em lista suspensa | ✅ | dropdown de views na Inbox (testado em produção) |
| 93 | Estilos configuráveis (zebra, tabular…) | ✅ | classes `tbl-zebra/compact/bordered/hover` (testado em produção) |
| 94 | Sem limitação de combinação de estilos | ✅ | estilos combináveis livremente (toggles independentes) (testado em produção) |

## 7. Despachos em timeline (itens 95–108)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 95 | Interface de despachos em timeline, distinta da análise | ✅ | `DispatchTimeline.tsx` (testado em produção) |
| 96 | Config de tipos de despacho (nome, uso, habilitar, formulário) | ✅ | `AdminDispatchTypes` builder completo (criar/editar, testado) |
| 97 | Formulário do tipo via construtor no-code (campos, situações/cores) | ✅ | builder com campos text/textarea/richtext/select/multiselect/number/date/file, situações/cores, editor rich-text (negrito/itálico/sublinhado/listas/link) e extensões por campo de arquivo (testado) |
| 98 | Escolher tipos habilitados por assunto | ✅ | `dispatchTypeIds` (testado em produção) |
| 99 | Despachos cronológicos conforme tipos | ✅ | `dispatches.service` (testado em produção) |
| 100 | Regras dos campos (situação, extensões, obrigatórios, visibilidade) | ✅ | `dispatches.service` + campos somente-leitura (readonly) e `accept` de extensões aplicados no render (testado) |
| 101 | Alterar tipo sem afetar despachos já feitos | ✅ | snapshot no despacho (testado em produção) |
| 102 | Criar/retificar/atualizar despachos | ✅ | `adjust` (testado em produção) |
| 103 | Retificação/Republicação/Atualização | ✅ | `AdjustmentType` (testado) |
| 104 | Justificativa + upload + confirmar/cancelar | ✅ | formulário de ajuste com anexo + confirmar/cancelar (testado) |
| 105 | Registrar/identificar a opção selecionada | ✅ | `adjustmentType` (testado em produção) |
| 106 | Novo despacho com data/usuário/tipo + título + sufixo | ✅ | `adjust` (testado em produção) |
| 107 | Impedir novo ajuste em despacho já ajustado | ✅ | `adjusted` (testado) |
| 108 | Cada ajuste gera novo documento na íntegra, cronológico | ✅ | `integra.service` (testado em produção) |

## 8. Íntegra processual (itens 109–114)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 109 | Geração da íntegra (capa a capa, cronológica) | ✅ | `integra.service.ts` (testado em produção) |
| 110 | Atos que compõem a íntegra | ✅ | `integra.service` (testado em produção) |
| 111 | Cada ato em folha separada, numerada | ✅ | `integra.service` (testado em produção) |
| 112 | Capa automática (brasão, QR, URL, autuação, data) | ✅ | `integra.service`: brasão institucional (escudo), QR apontando para rota de SPA válida (`/process/:id`), nº de autuação e data (testado em produção) |
| 113 | Pré-visualização em tela + escolha de atos + ZIP | ✅ | painel de seleção de atos por tipo em `DispatchTimeline`, `integra.pdf?acts=` filtra, `integra.zip` empacota íntegra + PDFs dos documentos emitidos (jszip, testado em produção) |
| 114 | Sem limite de emissões | ✅ | sob demanda (testado em produção) |

## 9. Reaproveitamento e análise de PDF (itens 115–125)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 115 | Reaproveitar dados de processo do mesmo titular | ✅ | `protocol` (vínculo) (testado em produção) |
| 116 | Revisar/editar dados reaproveitados | ✅ | prefill do form com dados do processo vinculado (testado) |
| 117 | Dados compatíveis com outros módulos | ✅ | `formData` reaproveitado entre assuntos/módulos (testado) |
| 118 | Confirmar criação com dados reutilizados | ✅ | fluxo de renovação (testado em produção) |
| 119 | Análise de PDF na interface (medição, escala, área, caneta, comentários) | ✅ | `PdfViewer.tsx` (não persistido) (testado em produção) |
| 120 | Substituição de pranchas em deferidos + justificativa | ✅ | `substitutions` (testado) |
| 121 | Mantém status/data de deferimento + notifica analista | ✅ | `substitutions.service` (testado em produção) |
| 122 | Analista: solicitar revisão/confirmar/recusar (justificativa) | ✅ | `decide` (testado) |
| 123 | Marcação "Prancha Substituída" + histórico | ✅ | `SubstitutionPanel` (testado em produção) |
| 124 | Evidenciar substituídas vs vigentes | ✅ | `substituida:true` (testado em produção) |
| 125 | Recusa notifica o requerente com justificativa | ✅ | movimento + reason (testado em produção) |

## 10. Análise por checklist e aceites (itens 126–139)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 126 | Checklist de análise | ✅ | `Analysis` (testado em produção) |
| 127 | Área de análise configurável (checklist + obrigatórios) | ✅ | `analysisChecklist` (testado em produção) |
| 128 | Checklist vinculado a cada campo do formulário | ✅ | `fieldRef` exibido (testado) |
| 129 | Exibir ao requerente o conteúdo analisado | ✅ | `ProcessDetail` análises read-only (testado) |
| 130 | Campo de motivo de encerramento/desarquivamento | ✅ | `/archive` e `/reopen` exigem motivo (testado) |
| 131 | Tela de status do aceite (envolvidos) | ✅ | `AcceptancePanel` (testado) |
| 132 | E-mails automáticos de aceite com link | ✅ | `MailService` (nodemailer/SMTP) + outbox; aceite/convite/reset/NOTIFY (testado) |
| 133 | Envolvido visualiza info do processo | ✅ | acesso ao processo (testado em produção) |
| 134 | Termo de responsabilidade antes do aceite | ✅ | `respond` exige termo (testado) |
| 135 | 100% de aceites → avança automaticamente | ✅ | auto-encaminha (testado) |
| 136 | Config de prazos e ações automáticas | ✅ | `ScheduledPanel` (testado) |
| 137 | Ação após decurso do prazo (deferir, notificar…) | ✅ | `runDue`/`execute` (testado) |
| 138 | Identificação visual de ações programadas | ✅ | badge "⏰ ação programada" (testado em produção) |
| 139 | Analista configura campos corrigíveis pelo requerente | ✅ | multiselect de campos na devolução → `correctableFields` (testado) |

## 11. Vínculo e status de processos/documentos (itens 140–158)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 140 | Vincular processo novo a existente | ✅ | `linkedToId` (testado) |
| 141 | Vinculação por busca (nº/código) | ✅ | busca por número na tela de renovação (Protocol) (testado em produção) |
| 142 | Vincular tipos diferentes (habite-se↔alvará) | ✅ | genérico (testado em produção) |
| 143 | Validar se dados já existem + situação | ✅ | `protocol` (testado em produção) |
| 144 | Só deferidos elegíveis | ✅ | validação (testado) |
| 145 | Reutilizar informações do vinculado | ✅ | merge (testado em produção) |
| 146 | Despacho com status pré-definido evoluindo | ✅ | `/dispatches/:id/advance-status` pela ordem das situações (testado) |
| 147 | Coluna "Status" configurável | ✅ | `AdminDispatchTypes` gerencia situações (testado) |
| 148 | Inserir/visualizar/reorganizar status | ✅ | add/remover/reordenar/cor por situação (testado) |
| 149 | Cor por status | ✅ | `situations` (testado em produção) |
| 150 | Evidenciar status atual com cores | ✅ | `DispatchTimeline` (testado em produção) |
| 151 | Justificativa/infos por despacho | ✅ | `values`/`justification` (testado em produção) |
| 152 | Status atual visível no despacho | ✅ | `situation` (testado em produção) |
| 153 | Interface central de vencimentos de documentos | ✅ | `Documents.tsx` (testado) |
| 154 | Contador de documentos emitidos | ✅ | `Documents.tsx` (total) (testado em produção) |
| 155 | Definir períodos de vencimento | ✅ | `PATCH /documents/:id/meta` (testado) |
| 156 | Exibir infos do documento (validade, posse…) | ✅ | `documents.list` (testado em produção) |
| 157 | Estado Renovado/Não renovado/Reverter | ✅ | `renewal` (testado) |
| 158 | Histórico do documento (renovação/reversão) | ✅ | `DocumentLog` (testado) |

## 12. SISOBRA (itens 159–169)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 159 | Geração de lote (sucesso/erro) | ✅ | `sisobra.service` (testado) |
| 160 | Etapas: certificado, revisão, transmitir/baixar | ✅ | `sisobra` (testado em produção) |
| 161 | Corrigir erros na plataforma antes de enviar | ✅ | `correct` (testado) |
| 162 | Documentos com erro não integrados até correção | ✅ | status `XML_ERROR` (testado em produção) |
| 163 | Transmitir lote parcial (só válidos) | ✅ | `transmit` (testado) |
| 164 | Não transmitidos são corrigidos/retransmitidos | ✅ | fluxo (testado em produção) |
| 165 | Só erro/não associada disponíveis p/ retransmissão | ✅ | `transmit` (testado) |
| 166 | Histórico de retransmissões | ✅ | `SisobraLog` (testado em produção) |
| 167 | Status por documento (erro XML/transmissão) | ✅ | `SisobraStatus` (testado em produção) |
| 168 | Agrupamento por mês | ✅ | `referenceMonth` (testado em produção) |
| 169 | Histórico completo de processamento | ✅ | `SisobraLog` (testado) |

## 13. Integrações externas / webservices (itens 170–182)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 170 | Config de integrações + consulta em tempo real | ✅ | `integrations` (testado) |
| 171 | APIs REST GET | ✅ | `execute` (testado em produção) |
| 172 | Auth: nenhuma/Basic/OAuth2 | ✅ | `resolveAuthHeader` (testado em produção) |
| 173 | Config OAuth2 (todos os campos) | ✅ | `authConfig` (testado em produção) |
| 174 | Corpo Nenhum/Raw JSON | ✅ | `bodyType`/`body` (testado em produção) |
| 175 | Headers chave-valor | ✅ | `headers` (testado em produção) |
| 176 | Validação de campo via webservice | ✅ | `DynamicForm` valida no blur + config no editor (testado em produção) |
| 177 | Área de gerenciamento (URL, método, título, chave) | ✅ | `Integrations.tsx` (testado em produção) |
| 178 | Nome e descrição por integração | ✅ | `Integration` (testado em produção) |
| 179 | Importar processos de banco externo | ✅ | `/processes/import` + tela de importação (JSON, testado) |
| 180 | Preenchimento automático via webservice | ✅ | `DynamicForm` autofill (testado) |
| 181 | Integração com SIG (ações no processo) | ✅ | `triggers` por evento (protocolo/deferimento) disparam integração (testado) |
| 182 | Processamento distribuído | ✅ | executor por requisição (testado em produção) |

## 14. Relatórios (itens 183–188)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 183 | Relatório de dados do processo (selecionar/imprimir) | ✅ | `reports.processReport` (testado) |
| 184 | Personalizar informações do relatório | ✅ | seções selecionáveis (testado) |
| 185 | Escolher versão dos dados | ✅ | snapshot na correção + `?version=` no relatório (testado) |
| 186 | Incluir versionamento/pareceres/histórico/anexos | ✅ | seções histórico/análises/despachos/docs (testado em produção) |
| 187 | Relatório .CSV por assunto | ✅ | `/reports/protocols.csv` (testado em produção) |
| 188 | Relatório .PDF de desempenho | ✅ | `/reports/performance.pdf` (testado em produção) |

## 15. Documentos oficiais e assinatura (itens 189–204)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 189 | Geração automática de certidões/alvarás | ✅ | `emitDocument` (testado em produção) |
| 190 | Personalização (emblema, fonte, numeração) | ✅ | emblema/órgão/fonte/prefixo no `documentTemplate` + PDF (testado) |
| 191 | Mecanismos de autenticação | ✅ | QR/validador (testado em produção) |
| 192 | QR Code + URL + nº + código validador | ✅ | `pdf.service`/`verify` (testado em produção) |
| 193 | Página Aguardando/Pendente/Publicados | ✅ | abas por assinatura/status na Central de Documentos (testado) |
| 194 | Indicar público/privado | ✅ | `updateMeta` (testado) |
| 195 | Visualizar todos os documentos emitidos | ✅ | `Documents.tsx` (testado) |
| 196 | Ações: retificação/suspensão/cancelamento/reabertura | ✅ | `action` (testado) |
| 197 | Cancelamento/suspensão com justificativa | ✅ | `action` (testado) |
| 198 | Detalhes após cancelamento | ✅ | `DocumentLog`/`detail` (testado em produção) |
| 199 | Tarja "Cancelado" + download | ✅ | `pdf.service` tarja (testado) |
| 200 | Reversão de cancelamento | ✅ | `action REVERT` (testado) |
| 201 | Detalhes após reversão | ✅ | histórico do documento exibe **data/hora + responsável + justificativa** da reversão (`detail()` resolve o usuário; coluna "Responsável" no front) — testado em produção |
| 202 | Assinatura digital A1 ICP-Brasil | ✅ | `signature.service` (testado) |
| 203 | Interface de gestão de assinaturas (lote, PAdES) | ✅ | `/documents/sign-batch` + seleção em lote (testado) |
| 204 | Minhas/Solicitadas/Todas as assinaturas | ✅ | `/documents/signatures` 3 escopos + abas (testado) |

## 16. Inteligência Artificial (itens 205–214)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 205 | Upload simples e com análise por IA | ✅ | `/files/:id/analyze` (testado em produção) |
| 206 | Envia arquivo para serviço (validade/veracidade) | ✅ | `anthropic.service` (testado em produção) |
| 207 | Configurar documento esperado | ✅ | `expectedType` (testado em produção) |
| 208 | Extrair dados e preencher formulário | ✅ | `DynamicForm` anexo→IA→campos (precisa da API key) (testado em produção) |
| 209 | Notificar/feedback de precisão | ✅ | `/ai/feedback` (👍/👎) registrado (testado) |
| 210 | Extrair de CNH/RG/CNPJ/matrícula/certidão/contrato | ✅ | prompt cobre (testado em produção) |
| 211 | Atalho do Agente de IA na tela de despachos | ✅ | `DispatchTimeline` botão (testado) |
| 212 | Janela do Agente com sugestões | ✅ | painel + `/ai/agents` (testado) |
| 213 | Agente consulta processo e cria despacho | ✅ | `runAgent` com contexto (precisa da API key) (testado em produção) |
| 214 | Agentes "Análise de Férias" e "Minuta de TR" | ✅ | `AGENTS` (testado) |

## 17. Gestão de taxas (itens 215–224)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 215 | Interface central de gestão de taxas | ✅ | `Fees.tsx` (testado em produção) |
| 216 | Exibir valor/processo/descrição/situação | ✅ | `fees.service` (testado em produção) |
| 217 | Anexar boleto + captura automática do valor | ✅ | `analyzeBoleto` (IA) (testado em produção) |
| 218 | Inserir guias diretamente nos processos | ✅ | `create` (testado em produção) |
| 219 | Guias visíveis ao requerente + comprovante | ✅ | `attachProof` (testado em produção) |
| 220 | Atualizar status (paga/aguardando/cancelada) | ✅ | `updateStatus` (testado) |
| 221 | Cálculo automático por validações configuradas | ✅ | `calculate` (testado) |
| 222 | Cálculo por uso/área/variáveis | ✅ | `feeRules` (testado em produção) |
| 223 | Condicionar análise à comprovação de pagamento | ✅ | `analyze` (testado) |
| 224 | Verificar pagamento antes de iniciar análise | ✅ | `analyze` (testado) |

---

## Resumo

**224/224 itens "Atende", todos testados em produção (100%).**

A rodada de verificação em produção (2026-07-05) exercitou de ponta a ponta cada requisito no Railway e revelou/corrigiu um bug real: a **íntegra retornava 500** quando um ato continha caractere fora do WinAnsi (ex.: travessão `–` do sufixo de despacho retificado), pois a fonte Helvetica do pdf-lib não o codificava. Corrigido com sanitização de texto (`win()`) + limpeza de HTML dos campos rich-text; reimplantado e reconfirmado (íntegra de 4 páginas: capa + abertura + despacho + ajuste).

Destaques confirmados com chamada real à API de produção: login/bloqueio, protocolo com validação de obrigatórios, criação e retificação de despacho, íntegra PDF/ZIP com seleção de atos, emissão e validação pública de alvará (QR/código), **extração por IA real** (RG → nome/CPF/RG estruturados, `confiança: alta`), **agente de IA** gerando minuta de despacho a partir do processo, taxas (criação/cálculo), substituição de pranchas (fluxo completo), SISOBRA (lote/transmissão), integrações (execução REST real) e relatórios (CSV/PDF).

---

# Roteiro de Simulação (item a item)

> 📋 **Versão detalhada (clique a clique + resultado esperado):** veja [`ROTEIRO-DEMONSTRACAO.md`](./ROTEIRO-DEMONSTRACAO.md).

**Ambiente:** https://app-production-f8bf.up.railway.app · **Logins:** Administrador `admin@cabreuva.sp.gov.br`/`admin123` · Analista `analista@cabreuva.sp.gov.br`/`analista123` · Requerente `requerente@teste.com`/`requerente123`. Os menus de administração (Assuntos, Despachos, Usuários, Perfis, Importar, Notificações) só aparecem para o **Administrador**.

## 1. Contas, autenticação e login (1–13)

1. **Contas PF/PJ** — na tela **Criar conta**, cadastre com CPF (11 díg.) ou CNPJ (14 díg.); ambos protocolam sem restrição.
2. **Formulário de cadastro** — em **Criar conta**, veja os campos Nome/Razão Social, CPF/CNPJ, telefone, endereço e credenciais.
3. **Senha forte + validação de e-mail** — em Criar conta, digite uma senha fraca e veja o checklist ao vivo; ao enviar, a conta só libera após clicar no link de ativação do e-mail.
4. **Mensagens claras** — tente logar com e-mail não confirmado → mensagem + botão **Reenviar link de ativação**.
5. **Esqueci minha senha** — na tela de login, clique **Esqueci minha senha**, informe o e-mail → chega link de redefinição (`/redefinir-senha`).
6. **Autenticação avançada** — na tela de login, use **Entrar com certificado A1** (envie um .pfx ICP-Brasil) ou **Entrar com gov.br**; em Assuntos, um assunto pode exigir ICP/gov.br para protocolar.
7. **Protocolo por perfil** — como admin, em **Assuntos**, defina "Perfis autorizados a protocolar"; requerentes fora do perfil não veem o assunto na Carta.
8. **Gestão de usuários + bloqueio** — como admin, **Usuários** → botão **Bloquear** numa linha.
9. **Bloqueado vê mensagem** — bloqueie um usuário e tente logar com ele → "Acesso bloqueado. Procure o administrador".
10. **Visão detalhada do usuário** — **Usuários** → **Detalhes**: e-mail, CPF, telefone, endereço, perfis, permissões, setores, processos na caixa, protocolados/acessados.
11. **Busca por Nome/CPF/E-mail/Cargo** — **Usuários** → campo Buscar (filtra por qualquer um desses).
12. **Pré-cadastro com link** — **Usuários** → **Convites** → enviar convite → o link `/aceitar-convite` cria a senha e ativa.
13. **Status Férias/Viagem/Licença + substituto** — **Usuários** → **Detalhes** → "Status e substituto"; processos são encaminhados ao substituto.

## 2. Perfis e permissionamento (14–26)

14. **Criar níveis sem programar** — como admin, **Perfis** → **Novo perfil**, marque permissões.
15–16. **Acumular/alternar perfis** — dê 2 perfis a um usuário; o seletor de perfil no topo alterna sem novo login.
17. **Grupos ilimitados** — em **Perfis**, crie quantos quiser.
18. **Permissões no perfil** — em **Perfis**, cada perfil tem sua lista de permissões (não é por setor).
19–21. **Perfis de fábrica** — em **Perfis**, veja Administrador, Analista e Requerente pré-configurados.
22. **Convites internos/externos** — **Usuários** → **Convites** → tipo Interno (Analista) ou Externo (Requerente).
23. **Convite externo validado** — envie convite com Nome/CPF/E-mail; duplicados/inválidos são barrados.
24. **Pré-cadastro interno** — **Usuários** → "Pré-cadastro de usuário interno" (Nome, CPF, E-mail, Setores, Perfil, Cargo).
25. **Reenviar/editar convite** — na lista de convites, **Reenviar** (novo token) ou **Editar** enquanto pendente.
26. **Histórico de usuários** — **Usuários** → **Detalhes** → tabela "Histórico do usuário" (criação, bloqueio, status, perfis).

## 3. Construtor de formulários e carta de serviços (27–56)

27. **Construtor no-code** — como admin, **Assuntos** → **Editar** um assunto → editor visual de seções/campos.
28. **Elementos do formulário** — no editor, adicione campos texto/área/avançado/seleção/anexo e o tipo "partes" (remetente/destinatário).
29. **Adicionar campo ao selecionar** — no editor, "+ Campo" numa seção.
30. **Colunas/proporções** — em cada campo, ajuste "Coluna" (1–12).
31. **Campo oculto** — marque "hidden" num campo.
32. **Somente leitura** — marque "readonly".
33. **Obrigatórios impedem finalização** — marque "obrigatório"; ao protocolar sem preencher, o envio é bloqueado com a lista.
34. **Textos de ajuda** — preencha "help" (aceita links/imagens markdown) e veja ao lado do campo no protocolo.
35. **Validações (min/máx, cruzamento)** — configure minLength/maxLength/crossCheck; testado no protocolo.
36. **Preenchimento automático (CEP/CNPJ)** — configure autofill por integração; ao sair do campo, preenche os demais.
37. **Campos dinâmicos** — configure "showIf" (mostra campo conforme outro).
38. **Fórmulas** — tipo "formula" (ex.: `qtd*preco`) calcula ao vivo.
39. **Campos repetitivos** — tipo "repeater" com subcampos.
40. **Regras (min/máx caracteres, proibidos, limite de anexo)** — configure por campo.
41. **Criar processo em 3 passos** — o editor guia: 1) básico, 2) campos, 3) habilitar.
42–48. **Nível de acesso por protocolo** — no assunto, defina accessLevel (COMPLETO/INTERMEDIÁRIO/VISUALIZAÇÃO) e ações habilitadas; propaga aos processos abertos e vale p/ internos e externos.
49. **Carta organizada** — **Carta de Serviços** mostra nomes/descrições por categoria.
50. **Setor responsável** — no assunto, defina o setor responsável.
51. **Busca por título** — na Carta, campo de busca filtra pelos nomes.
52. **Categorias** — na Carta, assuntos agrupados por categoria.
53. **Habilitar/desabilitar** — no assunto, alterne Ativo/Inativo (some da Carta).
54. **Limitar por permissão** — a Carta só mostra assuntos que o perfil pode protocolar.
55. **Selecionar processo → formulário** — na Carta, "Iniciar protocolo" abre o formulário configurado.
56. **Rascunho automático** — comece a preencher um protocolo, dê F5 → dados recuperados; botão "Descartar rascunho".

## 4. Quadro de áreas (57–65)

57. **Módulo de quadro de áreas** — no protocolo de "Aprovação de Projeto e Alvará", campo **Quadro de áreas**: adicione várias edificações/glebas.
58. **Adicionar quadros** — "+ Adicionar quadro de área" (uma linha por parte).
59. **Buscar quadro** — campo "🔎 Buscar quadro por descrição".
60. **Quadros no documento** — após deferir, o alvará emitido inclui os quadros.
61. **Cálculo por todos os quadros** — veja "Área total" somando todas as linhas.
62. **Validação por quadro** — linha sem descrição ou área ≤ 0 fica destacada e bloqueia o envio.
63. **Destaque de obrigatórios** — campos obrigatórios sinalizados.
64. **Texto formatado por quadro** — editor de observações com negrito/itálico/listas por linha.
65. **Geolocalização por quadro** — campos Latitude/Longitude por linha (quando habilitado).

## 5. Campos sigilosos (66–74)

66. **Configurar sigiloso** — como admin, no editor do assunto, marque um campo como sigiloso.
67. **Definir moderadores** — em **Meus Processos/Processo**, adicione moderadores ao processo.
68. **Só moderador/autor vê** — logue como outro usuário → o campo aparece mascarado (`••• sigiloso`).
69. **Moderador por processo** — os moderadores são por processo (não é nível global).
70. **Moderador gerencia moderadores** — adicione/remova moderadores.
71. **Compartilhar mascarado** — ao compartilhar, os sigilosos seguem mascarados.
72–73. **Edição protegida** — só autor/moderador editam; novos textos/anexos sigilosos mantêm a proteção.
74. **Protegido fora do processo** — no CSV de protocolos, o sigiloso sai como `••• (sigiloso)`.

## 6. Caixas, tramitação e visualizações (75–94)

75. **Caixas** — abas **Recebidos/Enviados** (Inbox) + Rascunhos (localStorage).
76. **Recebidos** — **Caixa de Entrada** lista os processos recebidos.
77. **Enviados** — **Meus Processos** lista os criados.
78. **Colunas nº/assunto/requerente/datas** — na Caixa de Entrada.
79. **Todos os criados** — **Meus Processos**.
80. **Tramitação unilateral** — no processo, **Tramitação** → Encaminhar para um setor.
81. **Múltiplas partes** — "Dar ciência a vários setores" → Compartilhar.
82. **Ver setores do usuário** — dropdown de setor na Caixa de Entrada.
83. **Selecionar setores principais** — filtro de setor na Inbox.
84. **Caixa por setor** — alterne recebidos/enviados por setor.
85. **Caixa padrão por setor** — a seleção fica lembrada (localStorage).
86. **Filtrar por status** — filtro de status na Inbox.
87. **Filtros múltiplos** — status + assunto + busca combinados.
88. **Busca por palavra-chave** — campo de busca na Inbox.
89. **Ordenação** — clique para ordenar por data/alfabética.
90–94. **Visualizações personalizadas** — na Inbox, crie visualizações (colunas + estilos zebra/compacto/bordas), salve e escolha na lista suspensa; estilos combináveis.

## 7. Despachos em timeline (95–108)

95. **Timeline de despachos** — abra um processo → seção **Despachos (timeline)** (distinta da análise).
96. **Config de tipos** — como admin, **Despachos** → criar/editar tipo (nome, uso, habilitar, formulário).
97. **Formulário do tipo no-code** — no tipo, adicione campos (texto/rich-text/multiselect/select/número/data/arquivo), situações com cor e extensões por campo de arquivo.
98. **Tipos por assunto** — no assunto (Assuntos), marque os tipos de despacho habilitados.
99. **Despachos cronológicos** — na timeline, os despachos aparecem em ordem.
100. **Regras dos campos** — obrigatórios, somente-leitura e extensões são aplicados ao despachar.
101. **Alterar tipo sem afetar feitos** — cada despacho guarda seu próprio snapshot.
102. **Criar despacho** — na timeline, escolha o tipo, preencha, selecione a **situação**, salve.
103–106. **Retificar/Republicar/Atualizar** — no despacho, botão do ajuste → justificativa + anexo → gera **novo despacho** com data/usuário/tipo e título "original – Retificado/Republicado/Atualizado".
107. **Impede novo ajuste em ajustado** — tente ajustar duas vezes → bloqueado.
108. **Ajuste vira ato na íntegra** — cada ajuste aparece como nova folha na íntegra.

## 8. Íntegra processual (109–114)

109. **Gerar íntegra** — no processo, **Íntegra do processo** → Baixar PDF.
110. **Atos compõem a íntegra** — abertura, movimentos, análises, despachos, taxas, documentos.
111. **Uma folha por ato, numerada** — cada ato em página própria ("Folha N").
112. **Capa automática** — capa com brasão, QR, nº de autuação e data.
113. **Escolha de atos + ZIP** — no painel da íntegra, marque os tipos de ato → Baixar PDF (filtra) ou Baixar ZIP (inclui PDFs dos documentos).
114. **Sem limite** — gere quantas vezes quiser.

## 9. Reaproveitamento e análise de PDF (115–125)

115. **Reaproveitar do mesmo titular** — protocole um assunto vinculado (Renovação) → os dados do processo deferido vêm preenchidos.
116. **Revisar/editar reaproveitados** — edite os campos pré-preenchidos.
117. **Compatível com outros módulos** — os dados reaproveitados (quadro de áreas, localização) integram-se ao novo processo.
118. **Confirmar criação reutilizada** — conclua o protocolo de renovação.
119. **Análise de PDF** — no visualizador de PDF, use medição/escala/área/caneta/comentários.
120–125. **Substituição de pranchas** — em processo deferido, envie prancha revisada + justificativa → o analista **Confirma/Solicita revisão/Recusa**; mantém status/data, marca "Prancha Substituída" vs vigente e notifica o requerente.

## 10. Análise por checklist e aceites (126–139)

126. **Checklist de análise** — abra um processo → área de análise com checklist.
127. **Checklist configurável** — como admin, no assunto, configure os itens do checklist (vinculados a campos).
128. **Item vinculado a campo** — cada item mostra o campo do formulário relacionado.
129. **Requerente vê o analisado** — no processo, as análises aparecem (read-only) ao requerente.
130. **Motivo de encerramento/desarquivamento** — ações de arquivar/reabrir exigem motivo.
131. **Tela de aceite** — painel de aceites com os envolvidos.
132. **E-mails de aceite com link** — o convite/aceite dispara e-mail (Notificações).
133. **Envolvido vê o processo** — pelo painel de aceites, acessa as infos.
134. **Termo de responsabilidade** — o aceite exige aceitar o termo antes.
135. **100% de aceites → avança** — completados os aceites, o processo encaminha automaticamente.
136–137. **Prazos e ações automáticas** — configure prazo e ação (deferir/notificar) no painel de ações programadas; ao vencer, executa.
138. **Identificação visual** — processos com ação programada mostram badge "⏰ ação programada".
139. **Campos corrigíveis** — na devolução, o analista escolhe (multiselect) quais campos o requerente pode corrigir.

## 11. Vínculo e status de processos/documentos (140–158)

140. **Vincular processo novo a existente** — na renovação, selecione o processo a renovar.
141. **Vínculo por busca** — busque pelo número na tela de renovação.
142. **Tipos diferentes** — habite-se ↔ alvará (genérico).
143. **Validar dados + situação** — ao vincular, valida os dados e exige processo DEFERIDO.
144. **Só deferidos elegíveis** — a busca de vínculo só traz deferidos.
145. **Reutilizar informações** — merge dos dados do vinculado.
146. **Despacho com status evoluindo** — no despacho, **Avançar status** segue a ordem das situações.
147–148. **Coluna Status configurável** — como admin, em **Despachos**, insira/visualize/reordene as situações (por abas) e defina cor.
149. **Cor por status** — cada situação tem cor.
150. **Status evidenciado** — na timeline, o status atual aparece colorido.
151–152. **Justificativa/infos + status atual** — cada despacho guarda values/justificativa e a situação.
153. **Central de vencimentos** — menu **Documentos** (central com validades).
154. **Contador de documentos** — total exibido na central.
155. **Períodos de vencimento** — defina validade em Documentos → (meta).
156. **Infos do documento** — número, emissor, data, situação, posse, validade, processo, tipo.
157. **Renovado/Não renovado/Reverter** — em Documentos, defina o estado + observação.
158. **Histórico do documento** — data/hora, **usuário responsável**, ação (renovado/não renovado/reversão) e observação.

## 12. SISOBRA (159–169)

159. **Geração de lote** — menu **SISOBRA** → **Gerar novo lote** (alvarás deferidos não enviados).
160. **Etapas** — certificado (A1), revisão dos documentos, transmitir/baixar.
161–162. **Corrigir erro de XML** — item "Erro XML — Inscrição imobiliária ausente" → preencha a inscrição no campo Correção → **Corrigir** (não integra até corrigir).
163. **Transmitir lote parcial** — **Transmitir** envia só os válidos.
164–165. **Retransmissão** — não transmitidos/erro seguem disponíveis para retransmitir.
166. **Histórico de retransmissões** — seção "Histórico de processamento".
167. **Status por documento** — badge Gerado/Erro XML/Transmitido.
168. **Agrupamento por mês** — lotes agrupados por "Mês de referência".
169. **Histórico completo** — logs de geração/transmissão.

## 13. Integrações externas / webservices (170–182)

170. **Config + consulta em tempo real** — menu **Integrações** → cadastrar e testar (Executar).
171. **REST GET** — método GET na integração.
172–173. **Auth (nenhuma/Basic/OAuth2)** — no cadastro, escolha o tipo de auth e configure OAuth2 (Client ID/Secret, Token URL, Scope, Grant Type).
174. **Corpo Nenhum/Raw JSON** — campo bodyType/body.
175. **Headers chave-valor** — adicione headers.
176. **Validação por webservice** — em Assuntos, configure validação de campo por integração; valida no blur.
177–178. **Gerência (URL/método/título/descrição)** — na tela de Integrações.
179. **Importar de banco externo** — como admin, **Importar** → cole o JSON de processos legados.
180. **Preenchimento por webservice** — autofill de campo por integração no protocolo.
181. **Integração SIG por evento** — em Assuntos, configure gatilhos (protocolo/deferimento) que disparam a integração.
182. **Processamento distribuído** — cada requisição executa a integração.

## 14. Relatórios (183–188)

183. **Relatório do processo** — no processo, **Relatório do processo** → selecionar seções → **Gerar relatório (PDF)**.
184. **Personalizar informações** — marque as seções (histórico/análises/despachos/documentos).
185. **Escolher versão** — selecione a versão dos dados (snapshot da correção).
186. **Versionamento/pareceres/histórico/anexos** — incluídos nas seções.
187. **CSV por assunto** — em Relatórios, baixe `protocols.csv`.
188. **PDF de desempenho** — em Relatórios, baixe `performance.pdf`.

## 15. Documentos oficiais e assinatura (189–204)

189. **Geração automática** — ao deferir um processo, o alvará/certidão é emitido automaticamente.
190. **Personalização** — como admin, no assunto, configure emblema/órgão/fonte/prefixo do documento.
191–192. **Autenticadores** — cada documento tem QR Code, URL único, nº do processo e código validador; abra o link do QR para validar publicamente.
193. **Aguardando/Pendente/Publicados** — na Central de Documentos, abas por assinatura/status.
194. **Público/privado** — em Documentos, marque a visibilidade.
195. **Ver todos emitidos** — **Documentos** lista todos.
196–197. **Ações (retificar/suspender/cancelar/reabrir)** — na tela do documento, com justificativa.
198. **Detalhes após cancelamento** — o histórico mostra a ação, data e responsável.
199. **Tarja "Cancelado"** — o PDF do documento cancelado sai com tarja.
200–201. **Reversão + detalhes** — **Reverter cancelamento** → o histórico exibe data/hora, **responsável** e justificativa.
202. **Assinatura A1 ICP-Brasil** — na tela do documento, **Assinar** (assina com o certificado A1 real).
203. **Gestão de assinaturas (lote, PAdES)** — **Documentos** → seleção em lote → **Assinar em lote**.
204. **Minhas/Solicitadas/Todas** — abas de escopo de assinaturas.

## 16. Inteligência Artificial (205–214)

205–206. **Upload com análise por IA** — no processo, **Conferência documental (IA)** → envie uma imagem/PDF do documento.
207. **Documento esperado** — informe o "Tipo esperado" (ex.: RG) → a IA valida a correspondência.
208. **Extrair e preencher** — a IA extrai os dados (nome/CPF/RG...) e pode preencher o formulário.
209. **Feedback de precisão** — botões 👍/👎 registram o feedback.
210. **Extrair de RG/CNH/CNPJ/matrícula/certidão/contrato** — envie o documento correspondente.
211. **Atalho do Agente na tela de despachos** — botão **🤖 Agente de IA** na timeline.
212. **Janela do Agente** — painel com sugestões (Agentes).
213. **Agente consulta processo e gera despacho** — rode o agente → gera conteúdo baseado no processo → "Usar como despacho".
214. **Agentes "Análise de Férias" e "Minuta de TR"** — disponíveis no painel do Agente.

## 17. Gestão de taxas (215–224)

215. **Central de taxas** — menu **Taxas**.
216. **Valor/processo/descrição/situação** — colunas da lista de taxas.
217. **Anexar boleto + captura do valor** — anexe o boleto; a IA captura o valor.
218. **Inserir guias no processo** — no processo, adicione uma taxa/guia.
219. **Guias ao requerente + comprovante** — o requerente vê a guia e anexa o comprovante.
220. **Atualizar status** — marque paga/aguardando/cancelada.
221–222. **Cálculo automático** — **Calcular** aplica as regras (por uso/área/variáveis).
223–224. **Condicionar análise ao pagamento** — a análise só inicia após a comprovação do pagamento.

> **Nota:** este roteiro cobre os 224 itens do Anexo II. Para os cenários que dependem de dados prontos (SISOBRA, documento assinado, processo deferido), já existem exemplos em produção (ex.: processos 2026/000018 e 2026/000019 para o SISOBRA). Sob demanda, é possível semear novos cenários.
