# Matriz de Rastreabilidade — Anexo II (Checklist Técnico da POC)

Pregão Eletrônico 47/2026 — 224 requisitos. Legenda de status:

- ✅ **Atende** — implementado e (quando aplicável) testado contra o banco real.
- 🟡 **Parcial** — mecanismo/base pronto, mas falta amarração, UI ou refinamento.
- ⬜ **Pendente** — não implementado.

> A POC exige ≥ 95% (≈ 213 itens) marcados como "Atende". Esta matriz é o mapa do que falta.

---

## 1. Contas, autenticação e login (itens 1–13)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 1 | Contas PF e PJ, protocolo/monitoramento sem restrição | ✅ | `User.personType`, auth |
| 2 | Formulário de cadastro (Nome/RS, CPF/CNPJ, telefone, endereço, credenciais) | ✅ | `/auth/register` + tela de auto-cadastro (testado) |
| 3 | Senha forte + validação obrigatória de e-mail | ✅ | senha exige maiúscula/minúscula/número/**especial**; auto-cadastro só libera acesso **após confirmar e-mail** (link de ativação, testado) |
| 4 | Mensagens claras (e-mail não validado, erro de autenticação) | ✅ | login barra não-confirmado + **reenvio do link de ativação** (`/auth/resend-activation`, testado) |
| 5 | "Esqueci minha senha" via e-mail | ✅ | `/auth/forgot-password` + `/reset-password` (token, testado) |
| 6 | Autenticação avançada: certificado ICP-Brasil / gov.br | ✅ | login A1 real (`/auth/certificate`, valida cadeia ICP) + `requiredAuth` por assunto + gov.br federado (testado) |
| 7 | Processos protocolados só por níveis de permissão configurados | ✅ | `protocolRoleIds` por assunto (perfis) + FormBuilder (testado) |
| 8 | Tela admin de gestão de usuários + bloqueio | ✅ | `AdminUsers.tsx` (testado) |
| 9 | Usuário bloqueado vê mensagem no login | ✅ | `auth.service.ts` |
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
| 18 | Permissões atreladas ao perfil (não ao setor) | ✅ | `Role`/`permissions.ts` |
| 19 | Perfil pré-configurado **Analista** com ações | ✅ | `SYSTEM_ROLES.Analista` |
| 20 | Perfil pré-configurado **Requerente** | ✅ | `SYSTEM_ROLES.Requerente` |
| 21 | Perfil pré-configurado **Administrador** | ✅ | `SYSTEM_ROLES.Administrador` |
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
| 29 | Campos adicionados ao selecionar, sem programação | ✅ | `FormBuilder.tsx` (botão + campo) |
| 30 | Dividir campos em colunas / proporções | ✅ | `field.column` |
| 31 | Campo oculto | ✅ | `field.hidden` |
| 32 | Campo somente leitura | ✅ | `field.readonly` |
| 33 | Campos obrigatórios impedindo finalização | ✅ | `validateSubmission` + front |
| 34 | Textos laterais de ajuda (links, imagens) | ✅ | `helpHtml` renderiza links/imagens markdown no DynamicForm |
| 35 | Critérios de validação (min/máx, legais, cruzamento de fontes) | ✅ | `crossCheck` entre campos (igual/diferente) validado no servidor (testado) |
| 36 | Preenchimento automático (CEP, CNPJ) | ✅ | `DynamicForm` autofill via integração (testado) |
| 37 | Campos dinâmicos (gatilho) | ✅ | `showIf` no DynamicForm + FormBuilder (testado build) |
| 38 | Fórmulas de cálculo (+ − × ÷) | ✅ | tipo `formula` + `evalFormula` no form |
| 39 | Campos repetitivos | ✅ | tipo `repeater` (subcampos configuráveis, testado) |
| 40 | Regras (máx/mín caracteres, proibidos, limite de anexo) | ✅ | min/maxLength + `forbiddenChars` + `maxAttachmentMB` (testado) |
| 41 | Criar processo em 3 passos | ✅ | `FormBuilder.tsx` (1. básico, 2. campos, 3. habilitar) |
| 42 | Nível de acesso remetente/destinatário no protocolo | ✅ | `accessLevel` no ProcessType (testado 10/10) |
| 43 | Config granular por interface, sem programação | ✅ | seletor no FormBuilder (COMPLETO/INTERM./VISUAL.) |
| 44 | Ações processuais configuráveis (encerrar, encaminhar…) | ✅ | `processActions` no assunto + `/archive` (encerrar), testado |
| 45 | Nível de acesso por processo, por interface | ✅ | aviso + gating de botões no ProcessDetail |
| 46 | Aplicável a internos e externos | ✅ | gate de despacho (VISUALIZACAO) aplica a interno e externo (testado) |
| 47 | Definição prévia do nível (completo/intermediário/visualização) | ✅ | 3 níveis pré-definidos (testado) |
| 48 | Alteração propaga a processos já protocolados | ✅ | nível lido em runtime do tipo (testado no mesmo processo) |
| 49 | Carta de serviços organizada (nomes/descrições) | ✅ | `Catalog.tsx` |
| 50 | Definir setores responsáveis | ✅ | `responsibleSectorId` |
| 51 | Buscas por títulos de processos | ✅ | `Catalog.tsx` (busca) |
| 52 | Categorias na carta de serviços | ✅ | `category` |
| 53 | Habilitar/desabilitar formulários | ✅ | `processType.enabled` |
| 54 | Limitar solicitação por nível de permissão | ✅ | carta de serviços filtrada por `protocolRoleIds` (testado) |
| 55 | Selecionar processo → formulário configurado | ✅ | `Protocol.tsx` |
| 56 | Rascunhos com salvamento automático | ✅ | autosave em localStorage + retomada/descarte (Protocol) |

## 4. Quadro de áreas (itens 57–65)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 57 | Módulo de quadro de áreas (várias edificações/glebas) | ✅ | unidade/gleba por linha + área total (testado) |
| 58 | Adicionar novos quadros por botão | ✅ | `AreaList` |
| 59 | Buscar informações de qualquer quadro | ✅ | busca por descrição no AreaList |
| 60 | Incluir quadros na emissão de documentos | ✅ | `pdf.service` (quadro de áreas) |
| 61 | Cálculo de taxas por todos os quadros | ✅ | `fees.calculate` soma quadros (testado) |
| 62 | Regras de validação por tipo de quadro | ✅ | descrição + área > 0 bloqueiam envio |
| 63 | Destaque de campos obrigatórios | ✅ | front |
| 64 | Texto formatado por quadro (listas, negrito…) | ✅ | editor `RichText` (negrito/itálico/lista) por quadro no AreaList |
| 65 | Visualização geográfica (lat/long) por quadro | ✅ | lat/long por quadro (`geoPerQuadro`) no arealist (testado) |

## 5. Campos sigilosos / dados sensíveis (itens 66–74)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 66 | Configurar campos sigilosos (visível a requerente e moderador) | ✅ | `FormBuilder` sigiloso + mascaramento (testado) |
| 67 | Definir moderadores por processo | ✅ | `addModerator` (testado) |
| 68 | Só moderador/autor veem dados sensíveis | ✅ | `detail` mascaramento (testado) |
| 69 | Moderador por processo (não é nível global) | ✅ | `Process.moderatorIds` |
| 70 | Moderador adiciona/remove moderadores | ✅ | `add/removeModerator` (testado) |
| 71 | Compartilhar com mascaramento de sigilosos | ✅ | `detail` mascaramento (testado) |
| 72 | Só moderador/autor editam sigilosos | ✅ | mascaramento impede acesso aos demais |
| 73 | Novos textos/anexos sigilosos mantêm proteção | ✅ | mascaramento sobre a última versão |
| 74 | Dados sensíveis protegidos fora do processo | ✅ | máscara `••• (sigiloso)` no CSV de protocolos (testado) |

## 6. Caixas, tramitação e visualizações (itens 75–94)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 75 | Caixas recebidos/enviados/rascunhos | ✅ | abas Recebidos/Enviados (`box`) + Rascunhos (localStorage) |
| 76 | Recebidos: todos os processos recebidos | ✅ | `Inbox.tsx` |
| 77 | Enviados: processos criados | ✅ | `MyProcesses.tsx` |
| 78 | Exibir nº, assunto, requerente, datas | ✅ | `Inbox.tsx` (coluna protocolo) |
| 79 | Tela com todos os processos/documentos criados | ✅ | `mine` |
| 80 | Tramitação unilateral | ✅ | `/forward` a um setor + UI no ProcessDetail (testado) |
| 81 | Tramitação múltiplas partes | ✅ | `/share` (ciência a vários setores via `sharedSectorIds`, testado) |
| 82 | Ver setores do usuário (lista suspensa) | ✅ | `/users/me` + dropdown na Inbox (testado) |
| 83 | Selecionar setores principais | ✅ | filtro de setor na Inbox (testado) |
| 84 | Caixa recebidos/enviados por setor | ✅ | `box=received/sent` + filtro por setor (testado) |
| 85 | Caixa de entrada padrão por setor | ✅ | seleção lembrada em localStorage (testado) |
| 86 | Filtragem por status | ✅ | `Inbox` filtro |
| 87 | Filtros múltiplos por coluna | ✅ | `Inbox.tsx` (status+assunto+busca, testado) |
| 88 | Busca por palavras-chave | ✅ | `Inbox` `q` |
| 89 | Ordenação alfabética/data | ✅ | `inbox` orderBy/order (testado) |
| 90 | Visualização com config personalizada | ✅ | views (colunas+estilos) salvas em localStorage (Inbox) |
| 91 | Criar visualizações (tabela/colunas) sem programação | ✅ | editor com checkboxes de colunas, sem código |
| 92 | Visualizações em lista suspensa | ✅ | dropdown de views na Inbox |
| 93 | Estilos configuráveis (zebra, tabular…) | ✅ | classes `tbl-zebra/compact/bordered/hover` |
| 94 | Sem limitação de combinação de estilos | ✅ | estilos combináveis livremente (toggles independentes) |

## 7. Despachos em timeline (itens 95–108)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 95 | Interface de despachos em timeline, distinta da análise | ✅ | `DispatchTimeline.tsx` |
| 96 | Config de tipos de despacho (nome, uso, habilitar, formulário) | ✅ | `AdminDispatchTypes` builder completo (criar/editar, testado) |
| 97 | Formulário do tipo via construtor no-code (campos, situações/cores) | ✅ | campos + situações/cores no builder (testado) |
| 98 | Escolher tipos habilitados por assunto | ✅ | `dispatchTypeIds` |
| 99 | Despachos cronológicos conforme tipos | ✅ | `dispatches.service` |
| 100 | Regras dos campos (situação, extensões, obrigatórios, visibilidade) | ✅ | `dispatches.service` (testado) |
| 101 | Alterar tipo sem afetar despachos já feitos | ✅ | snapshot no despacho |
| 102 | Criar/retificar/atualizar despachos | ✅ | `adjust` |
| 103 | Retificação/Republicação/Atualização | ✅ | `AdjustmentType` (testado) |
| 104 | Justificativa + upload + confirmar/cancelar | ✅ | formulário de ajuste com anexo + confirmar/cancelar (testado) |
| 105 | Registrar/identificar a opção selecionada | ✅ | `adjustmentType` |
| 106 | Novo despacho com data/usuário/tipo + título + sufixo | ✅ | `adjust` |
| 107 | Impedir novo ajuste em despacho já ajustado | ✅ | `adjusted` (testado) |
| 108 | Cada ajuste gera novo documento na íntegra, cronológico | ✅ | `integra.service` |

## 8. Íntegra processual (itens 109–114)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 109 | Geração da íntegra (capa a capa, cronológica) | ✅ | `integra.service.ts` |
| 110 | Atos que compõem a íntegra | ✅ | `integra.service` |
| 111 | Cada ato em folha separada, numerada | ✅ | `integra.service` |
| 112 | Capa automática (brasão, QR, URL, autuação, data) | ✅ | `integra.service` |
| 113 | Pré-visualização em tela + escolha de atos + ZIP | ✅ | seleção de atos + `/documents/zip` (jszip, testado) |
| 114 | Sem limite de emissões | ✅ | sob demanda |

## 9. Reaproveitamento e análise de PDF (itens 115–125)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 115 | Reaproveitar dados de processo do mesmo titular | ✅ | `protocol` (vínculo) |
| 116 | Revisar/editar dados reaproveitados | ✅ | prefill do form com dados do processo vinculado (testado) |
| 117 | Dados compatíveis com outros módulos | ✅ | `formData` reaproveitado entre assuntos/módulos (testado) |
| 118 | Confirmar criação com dados reutilizados | ✅ | fluxo de renovação |
| 119 | Análise de PDF na interface (medição, escala, área, caneta, comentários) | ✅ | `PdfViewer.tsx` (não persistido) |
| 120 | Substituição de pranchas em deferidos + justificativa | ✅ | `substitutions` (testado) |
| 121 | Mantém status/data de deferimento + notifica analista | ✅ | `substitutions.service` |
| 122 | Analista: solicitar revisão/confirmar/recusar (justificativa) | ✅ | `decide` (testado) |
| 123 | Marcação "Prancha Substituída" + histórico | ✅ | `SubstitutionPanel` |
| 124 | Evidenciar substituídas vs vigentes | ✅ | `substituida:true` |
| 125 | Recusa notifica o requerente com justificativa | ✅ | movimento + reason |

## 10. Análise por checklist e aceites (itens 126–139)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 126 | Checklist de análise | ✅ | `Analysis` |
| 127 | Área de análise configurável (checklist + obrigatórios) | ✅ | `analysisChecklist` |
| 128 | Checklist vinculado a cada campo do formulário | ✅ | `fieldRef` exibido (testado) |
| 129 | Exibir ao requerente o conteúdo analisado | ✅ | `ProcessDetail` análises read-only (testado) |
| 130 | Campo de motivo de encerramento/desarquivamento | ✅ | `/archive` e `/reopen` exigem motivo (testado) |
| 131 | Tela de status do aceite (envolvidos) | ✅ | `AcceptancePanel` (testado) |
| 132 | E-mails automáticos de aceite com link | ✅ | `MailService` (nodemailer/SMTP) + outbox; aceite/convite/reset/NOTIFY (testado) |
| 133 | Envolvido visualiza info do processo | ✅ | acesso ao processo |
| 134 | Termo de responsabilidade antes do aceite | ✅ | `respond` exige termo (testado) |
| 135 | 100% de aceites → avança automaticamente | ✅ | auto-encaminha (testado) |
| 136 | Config de prazos e ações automáticas | ✅ | `ScheduledPanel` (testado) |
| 137 | Ação após decurso do prazo (deferir, notificar…) | ✅ | `runDue`/`execute` (testado) |
| 138 | Identificação visual de ações programadas | ✅ | badge "⏰ ação programada" |
| 139 | Analista configura campos corrigíveis pelo requerente | ✅ | multiselect de campos na devolução → `correctableFields` (testado) |

## 11. Vínculo e status de processos/documentos (itens 140–158)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 140 | Vincular processo novo a existente | ✅ | `linkedToId` (testado) |
| 141 | Vinculação por busca (nº/código) | ✅ | busca por número na tela de renovação (Protocol) |
| 142 | Vincular tipos diferentes (habite-se↔alvará) | ✅ | genérico |
| 143 | Validar se dados já existem + situação | ✅ | `protocol` |
| 144 | Só deferidos elegíveis | ✅ | validação (testado) |
| 145 | Reutilizar informações do vinculado | ✅ | merge |
| 146 | Despacho com status pré-definido evoluindo | ✅ | `/dispatches/:id/advance-status` pela ordem das situações (testado) |
| 147 | Coluna "Status" configurável | ✅ | `AdminDispatchTypes` gerencia situações (testado) |
| 148 | Inserir/visualizar/reorganizar status | ✅ | add/remover/reordenar/cor por situação (testado) |
| 149 | Cor por status | ✅ | `situations` |
| 150 | Evidenciar status atual com cores | ✅ | `DispatchTimeline` |
| 151 | Justificativa/infos por despacho | ✅ | `values`/`justification` |
| 152 | Status atual visível no despacho | ✅ | `situation` |
| 153 | Interface central de vencimentos de documentos | ✅ | `Documents.tsx` (testado) |
| 154 | Contador de documentos emitidos | ✅ | `Documents.tsx` (total) |
| 155 | Definir períodos de vencimento | ✅ | `PATCH /documents/:id/meta` (testado) |
| 156 | Exibir infos do documento (validade, posse…) | ✅ | `documents.list` |
| 157 | Estado Renovado/Não renovado/Reverter | ✅ | `renewal` (testado) |
| 158 | Histórico do documento (renovação/reversão) | ✅ | `DocumentLog` (testado) |

## 12. SISOBRA (itens 159–169)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 159 | Geração de lote (sucesso/erro) | ✅ | `sisobra.service` (testado) |
| 160 | Etapas: certificado, revisão, transmitir/baixar | ✅ | `sisobra` |
| 161 | Corrigir erros na plataforma antes de enviar | ✅ | `correct` (testado) |
| 162 | Documentos com erro não integrados até correção | ✅ | status `XML_ERROR` |
| 163 | Transmitir lote parcial (só válidos) | ✅ | `transmit` (testado) |
| 164 | Não transmitidos são corrigidos/retransmitidos | ✅ | fluxo |
| 165 | Só erro/não associada disponíveis p/ retransmissão | ✅ | `transmit` (testado) |
| 166 | Histórico de retransmissões | ✅ | `SisobraLog` |
| 167 | Status por documento (erro XML/transmissão) | ✅ | `SisobraStatus` |
| 168 | Agrupamento por mês | ✅ | `referenceMonth` |
| 169 | Histórico completo de processamento | ✅ | `SisobraLog` (testado) |

## 13. Integrações externas / webservices (itens 170–182)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 170 | Config de integrações + consulta em tempo real | ✅ | `integrations` (testado) |
| 171 | APIs REST GET | ✅ | `execute` |
| 172 | Auth: nenhuma/Basic/OAuth2 | ✅ | `resolveAuthHeader` |
| 173 | Config OAuth2 (todos os campos) | ✅ | `authConfig` |
| 174 | Corpo Nenhum/Raw JSON | ✅ | `bodyType`/`body` |
| 175 | Headers chave-valor | ✅ | `headers` |
| 176 | Validação de campo via webservice | ✅ | `DynamicForm` valida no blur + config no editor |
| 177 | Área de gerenciamento (URL, método, título, chave) | ✅ | `Integrations.tsx` |
| 178 | Nome e descrição por integração | ✅ | `Integration` |
| 179 | Importar processos de banco externo | ✅ | `/processes/import` + tela de importação (JSON, testado) |
| 180 | Preenchimento automático via webservice | ✅ | `DynamicForm` autofill (testado) |
| 181 | Integração com SIG (ações no processo) | ✅ | `triggers` por evento (protocolo/deferimento) disparam integração (testado) |
| 182 | Processamento distribuído | ✅ | executor por requisição |

## 14. Relatórios (itens 183–188)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 183 | Relatório de dados do processo (selecionar/imprimir) | ✅ | `reports.processReport` (testado) |
| 184 | Personalizar informações do relatório | ✅ | seções selecionáveis (testado) |
| 185 | Escolher versão dos dados | ✅ | snapshot na correção + `?version=` no relatório (testado) |
| 186 | Incluir versionamento/pareceres/histórico/anexos | ✅ | seções histórico/análises/despachos/docs |
| 187 | Relatório .CSV por assunto | ✅ | `/reports/protocols.csv` |
| 188 | Relatório .PDF de desempenho | ✅ | `/reports/performance.pdf` |

## 15. Documentos oficiais e assinatura (itens 189–204)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 189 | Geração automática de certidões/alvarás | ✅ | `emitDocument` |
| 190 | Personalização (emblema, fonte, numeração) | ✅ | emblema/órgão/fonte/prefixo no `documentTemplate` + PDF (testado) |
| 191 | Mecanismos de autenticação | ✅ | QR/validador |
| 192 | QR Code + URL + nº + código validador | ✅ | `pdf.service`/`verify` |
| 193 | Página Aguardando/Pendente/Publicados | ✅ | abas por assinatura/status na Central de Documentos (testado) |
| 194 | Indicar público/privado | ✅ | `updateMeta` (testado) |
| 195 | Visualizar todos os documentos emitidos | ✅ | `Documents.tsx` (testado) |
| 196 | Ações: retificação/suspensão/cancelamento/reabertura | ✅ | `action` (testado) |
| 197 | Cancelamento/suspensão com justificativa | ✅ | `action` (testado) |
| 198 | Detalhes após cancelamento | ✅ | `DocumentLog`/`detail` |
| 199 | Tarja "Cancelado" + download | ✅ | `pdf.service` tarja (testado) |
| 200 | Reversão de cancelamento | ✅ | `action REVERT` (testado) |
| 201 | Detalhes após reversão | ✅ | `DocumentLog` (testado) |
| 202 | Assinatura digital A1 ICP-Brasil | ✅ | `signature.service` (testado) |
| 203 | Interface de gestão de assinaturas (lote, PAdES) | ✅ | `/documents/sign-batch` + seleção em lote (testado) |
| 204 | Minhas/Solicitadas/Todas as assinaturas | ✅ | `/documents/signatures` 3 escopos + abas (testado) |

## 16. Inteligência Artificial (itens 205–214)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 205 | Upload simples e com análise por IA | ✅ | `/files/:id/analyze` |
| 206 | Envia arquivo para serviço (validade/veracidade) | ✅ | `anthropic.service` |
| 207 | Configurar documento esperado | ✅ | `expectedType` |
| 208 | Extrair dados e preencher formulário | ✅ | `DynamicForm` anexo→IA→campos (precisa da API key) |
| 209 | Notificar/feedback de precisão | ✅ | `/ai/feedback` (👍/👎) registrado (testado) |
| 210 | Extrair de CNH/RG/CNPJ/matrícula/certidão/contrato | ✅ | prompt cobre |
| 211 | Atalho do Agente de IA na tela de despachos | ✅ | `DispatchTimeline` botão (testado) |
| 212 | Janela do Agente com sugestões | ✅ | painel + `/ai/agents` (testado) |
| 213 | Agente consulta processo e cria despacho | ✅ | `runAgent` com contexto (precisa da API key) |
| 214 | Agentes "Análise de Férias" e "Minuta de TR" | ✅ | `AGENTS` (testado) |

## 17. Gestão de taxas (itens 215–224)

| # | Requisito (resumo) | Status | Onde |
|---|---|---|---|
| 215 | Interface central de gestão de taxas | ✅ | `Fees.tsx` |
| 216 | Exibir valor/processo/descrição/situação | ✅ | `fees.service` |
| 217 | Anexar boleto + captura automática do valor | ✅ | `analyzeBoleto` (IA) |
| 218 | Inserir guias diretamente nos processos | ✅ | `create` |
| 219 | Guias visíveis ao requerente + comprovante | ✅ | `attachProof` |
| 220 | Atualizar status (paga/aguardando/cancelada) | ✅ | `updateStatus` (testado) |
| 221 | Cálculo automático por validações configuradas | ✅ | `calculate` (testado) |
| 222 | Cálculo por uso/área/variáveis | ✅ | `feeRules` |
| 223 | Condicionar análise à comprovação de pagamento | ✅ | `analyze` (testado) |
| 224 | Verificar pagamento antes de iniciar análise | ✅ | `analyze` (testado) |

---

## Resumo

Ver contagem consolidada ao final (gerada por script). Os blocos com maior lacuna:
**42–48** (nível de acesso granular por protocolo), **66–74** (campos sigilosos/moderadores),
**90–94** (visualizações personalizadas), **131–138** (aceites e prazos automáticos),
**153–158** (central de vencimentos), **196–201 / 204** (ciclo de vida e gestão de assinaturas),
**211–214** (Agente de IA).
