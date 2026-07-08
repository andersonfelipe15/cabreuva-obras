# Roteiro de Demonstração — passo a passo por item (Anexo II)

**Ambiente:** https://app-production-f8bf.up.railway.app
**Logins:**
- **Administrador** — `admin@cabreuva.sp.gov.br` / `admin123`
- **Analista** — `analista@cabreuva.sp.gov.br` / `analista123`
- **Requerente** — `requerente@teste.com` / `requerente123`

> Os menus **Assuntos, Despachos, Usuários, Perfis, Importar, Notificações** só aparecem no perfil **Administrador**. "✅ Esperado" indica o que deve acontecer.

---

## Módulo 1 — Contas, autenticação e login (1–13)

### 1. Contas PF e PJ
1. Na tela de login, clique **Criar conta**.
2. Cadastre uma conta com CPF (pessoa física) e outra com CNPJ (pessoa jurídica).
3. ✅ Esperado: ambas são aceitas e podem protocolar/monitorar sem restrição.

### 2. Formulário de cadastro
1. Abra **Criar conta**.
2. ✅ Esperado: campos Nome/Razão Social, CPF/CNPJ, Telefone, Endereço e Credenciais (e-mail/senha).

### 3. Senha forte + validação de e-mail
1. Em **Criar conta**, digite uma senha simples (ex.: `abc`).
2. ✅ Esperado: checklist ao vivo mostra o que falta (maiúscula, número, especial, 8+).
3. Complete os campos com senha forte e envie.
4. ✅ Esperado: mensagem "confirme seu e-mail"; o acesso **só libera** após clicar no link de ativação recebido.

### 4. Mensagens claras (e-mail não validado / erro de login)
1. Tente logar com uma conta ainda não confirmada.
2. ✅ Esperado: mensagem de e-mail não confirmado + botão **Reenviar link de ativação**.
3. Tente logar com senha errada → mensagem clara "Credenciais inválidas".

### 5. Esqueci minha senha
1. Na tela de login, clique **Esqueci minha senha**.
2. Informe o e-mail cadastrado.
3. ✅ Esperado: e-mail com link de redefinição (`/redefinir-senha`, válido 1h).

### 6. Autenticação avançada (ICP-Brasil / gov.br)
1. Na tela de login, em "Autenticação avançada", selecione o **certificado A1** (.pfx) e a senha → **Entrar com certificado**.
2. ✅ Esperado: valida a cadeia ICP-Brasil e autentica.
3. Alternativa: **Entrar com gov.br** (federado).
4. (Config) Como admin, em **Assuntos**, um assunto pode exigir ICP ou gov.br para ser protocolado.

### 7. Protocolo restrito por perfil
1. Login admin → **Assuntos** → edite um assunto → defina "Perfis autorizados a protocolar".
2. Login com um requerente fora do perfil.
3. ✅ Esperado: o assunto **não aparece** na Carta de Serviços dele.

### 8. Gestão de usuários + bloqueio
1. Login admin → **Usuários**.
2. Numa linha, clique **Bloquear**.
3. ✅ Esperado: status muda para BLOCKED.

### 9. Usuário bloqueado vê mensagem
1. Bloqueie um usuário (item 8) → **Sair**.
2. Tente entrar com esse usuário.
3. ✅ Esperado: "Acesso bloqueado. Procure o administrador do sistema."

### 10. Visão detalhada do usuário
1. Login admin → **Usuários** → **Detalhes** de um usuário.
2. ✅ Esperado: e-mail, nome, CPF, telefone, endereço, perfis, permissões, setores, processos na caixa, protocolados e acessados.

### 11. Busca por Nome/CPF/E-mail/Cargo
1. **Usuários** → campo **Buscar**.
2. Digite parte do nome, CPF, e-mail ou cargo → **Buscar**.
3. ✅ Esperado: lista filtrada.

### 12. Pré-cadastro com link de confirmação
1. **Usuários** → seção **Convites** → preencha Nome/CPF/E-mail → **Enviar convite**.
2. ✅ Esperado: link `/aceitar-convite`; ao abri-lo, o convidado cria a senha e ativa a conta.

### 13. Status Férias/Viagem/Licença + substituto
1. **Usuários** → **Detalhes** → "Status e substituto".
2. Selecione Férias e um substituto → **Salvar status**.
3. ✅ Esperado: processos do setor passam a ser encaminhados ao substituto.

---

## Módulo 2 — Perfis e permissionamento (14–26)

### 14. Criar níveis de acesso sem programação
1. Login admin → **Perfis** → **Novo perfil** → marque permissões → salve.
2. ✅ Esperado: perfil criado pela interface, sem código.

### 15. Acumular múltiplos níveis
1. **Usuários** → **Detalhes** → atribua um segundo perfil ao usuário (se aplicável).
2. ✅ Esperado: o usuário possui mais de um perfil.

### 16. Alternar perfil sem novo login
1. Logado com usuário de 2 perfis, use o **seletor de perfil** no topo.
2. ✅ Esperado: troca de perfil ativo sem deslogar.

### 17. Grupos de permissão ilimitados
1. **Perfis** → crie vários perfis.
2. ✅ Esperado: sem limite de grupos.

### 18. Permissões atreladas ao perfil
1. **Perfis** → abra um perfil.
2. ✅ Esperado: as permissões estão no perfil (não no setor).

### 19–21. Perfis pré-configurados (Analista, Requerente, Administrador)
1. **Perfis**.
2. ✅ Esperado: os três perfis de fábrica já existem, com suas ações.

### 22. Envio de convites (internos/externos)
1. **Usuários** → **Convites** → tipo **Interno (Analista)** ou **Externo (Requerente)** → **Enviar**.

### 23. Convite externo validado
1. Envie convite externo com Nome/CPF/E-mail.
2. ✅ Esperado: e-mail/CPF duplicado ou inválido é barrado; aceite gera a conta.

### 24. Pré-cadastro interno
1. **Usuários** → "Pré-cadastro de usuário interno" → Nome, CPF, E-mail, Cargo, **Perfil**, **Setores** → **Cadastrar**.

### 25. Convites reenviados/editados
1. Na lista de **Convites** (status PENDENTE): **Reenviar** (novo token) ou **Editar**.

### 26. Histórico de usuários
1. **Usuários** → **Detalhes** → "Histórico do usuário".
2. ✅ Esperado: eventos (criação, bloqueio, mudança de status/perfil) com data.

---

## Módulo 3 — Construtor de formulários e carta de serviços (27–56)

### 27. Construtor no-code
1. Login admin → **Assuntos** → **Editar** um assunto.
2. ✅ Esperado: editor visual de seções e campos.

### 28. Elementos do formulário
1. No editor, adicione campos de texto, área, avançado, seleção, anexo e o tipo "partes" (remetente/destinatário).

### 29. Adicionar campo ao selecionar
1. No editor, numa seção clique **+ Campo**.
2. ✅ Esperado: o campo é inserido sem programar.

### 30. Colunas / proporções
1. Num campo, defina **Coluna** (1–12).
2. ✅ Esperado: os campos se dividem em colunas no formulário.

### 31. Campo oculto
1. Marque **hidden** num campo.
2. ✅ Esperado: o campo não aparece ao requerente.

### 32. Campo somente leitura
1. Marque **readonly** num campo.
2. ✅ Esperado: o campo aparece bloqueado para edição.

### 33. Obrigatórios impedem finalização
1. Marque um campo como **obrigatório**.
2. No protocolo, deixe-o vazio e tente enviar.
3. ✅ Esperado: envio bloqueado com a lista de campos faltantes.

### 34. Textos de ajuda (links/imagens)
1. Preencha o campo **help** (aceita markdown com link/imagem).
2. ✅ Esperado: o texto de ajuda aparece ao lado do campo no protocolo.

### 35. Critérios de validação (min/máx, cruzamento)
1. Configure minLength/maxLength ou **crossCheck** entre dois campos.
2. ✅ Esperado: o servidor valida no protocolo.

### 36. Preenchimento automático (CEP/CNPJ)
1. Configure **autofill** por integração num campo.
2. No protocolo, preencha o campo-gatilho e saia (blur).
3. ✅ Esperado: os demais campos são preenchidos automaticamente.

### 37. Campos dinâmicos
1. Configure **showIf** (mostrar campo conforme outro).
2. ✅ Esperado: o campo aparece/some conforme a condição.

### 38. Fórmulas de cálculo
1. Crie um campo tipo **formula** (ex.: `qtd*preco`).
2. ✅ Esperado: cálculo ao vivo no formulário.

### 39. Campos repetitivos
1. Crie um campo tipo **repeater** com subcampos.
2. ✅ Esperado: o requerente adiciona várias entradas.

### 40. Regras (min/máx caracteres, proibidos, limite de anexo)
1. Configure por campo (minLength/maxLength/forbiddenChars/maxAttachmentMB).
2. ✅ Esperado: violação bloqueia o envio.

### 41. Criar processo em 3 passos
1. Em **Assuntos** → **Novo**: 1) dados básicos, 2) campos, 3) habilitar.

### 42–48. Nível de acesso por protocolo
1. No assunto, defina **accessLevel**: COMPLETO / INTERMEDIÁRIO / VISUALIZAÇÃO e as ações habilitadas.
2. Abra um processo desse assunto.
3. ✅ Esperado: os botões de ação respeitam o nível (ex.: VISUALIZAÇÃO bloqueia tudo); a mudança propaga a processos já abertos e vale para internos e externos.

### 49. Carta organizada (nomes/descrições)
1. Menu **Carta de Serviços**.
2. ✅ Esperado: assuntos com nome e descrição, por categoria.

### 50. Setor responsável
1. No assunto, defina o setor responsável.

### 51. Busca por título
1. Na **Carta de Serviços**, use o campo de busca.
2. ✅ Esperado: filtra pelos nomes dos assuntos.

### 52. Categorias
1. Na Carta, os assuntos aparecem agrupados por categoria.

### 53. Habilitar/desabilitar formulários
1. No assunto, alterne **Ativo/Inativo**.
2. ✅ Esperado: inativo some da Carta.

### 54. Limitar solicitação por permissão
1. Defina "Perfis autorizados a protocolar".
2. ✅ Esperado: a Carta filtra pelos assuntos que o perfil pode protocolar.

### 55. Selecionar processo → formulário
1. Na Carta, clique **Iniciar protocolo** num assunto.
2. ✅ Esperado: abre o formulário configurado.

### 56. Rascunho com salvamento automático
1. Comece a preencher um protocolo.
2. Dê **F5** (ou saia e volte ao mesmo assunto).
3. ✅ Esperado: dados recuperados + aviso "💾 Rascunho recuperado" e botão **Descartar rascunho**; ao protocolar, o rascunho é apagado.

---

## Módulo 4 — Quadro de áreas (57–65)

### 57. Módulo de quadro de áreas
1. Requerente → **Carta de Serviços** → "Aprovação de Projeto e Alvará" → **Iniciar protocolo**.
2. Role até o campo **Quadro de áreas**.
3. ✅ Esperado: módulo para detalhar várias edificações/glebas.

### 58. Adicionar quadros por botão
1. Clique **+ Adicionar quadro de área** e preencha Descrição / Unidade-Gleba / Área.
2. Repita para outras partes.

### 59. Buscar informações de qualquer quadro
1. No campo **🔎 Buscar quadro por descrição**, digite parte da descrição.
2. ✅ Esperado: filtra as linhas.

### 60. Quadros na emissão de documentos
1. Protocole com quadros e deixe o processo ser deferido.
2. ✅ Esperado: o alvará emitido inclui o quadro de áreas.

### 61. Cálculo por todos os quadros
1. Com vários quadros preenchidos, observe **Área total**.
2. ✅ Esperado: soma automática de todas as áreas.

### 62. Validação por tipo de quadro
1. Deixe uma linha sem descrição ou com área ≤ 0.
2. ✅ Esperado: linha destacada e envio bloqueado.

### 63. Destaque de obrigatórios
1. ✅ Esperado: campos obrigatórios sinalizados.

### 64. Texto formatado por quadro
1. Numa linha, use o editor de **Observações** (negrito, itálico, listas).

### 65. Geolocalização por quadro
1. Preencha **Latitude/Longitude** de uma linha (quando habilitado).
2. ✅ Esperado: coordenadas por parte do empreendimento.

---

## Módulo 5 — Campos sigilosos (66–74)

### 66. Configurar campo sigiloso
1. Admin → **Assuntos** → editor → marque um campo como **sigiloso** → salve.

### 67. Definir moderadores por processo
1. Abra um processo → adicione **moderadores**.

### 68. Só moderador/autor veem
1. Logue como um usuário que não é autor nem moderador.
2. ✅ Esperado: o campo sigiloso aparece como `••• (sigiloso)`.

### 69. Moderador por processo (não global)
1. ✅ Esperado: a moderação vale só naquele processo.

### 70. Moderador gerencia moderadores
1. Como moderador, adicione/remova outros moderadores.

### 71. Compartilhar com mascaramento
1. Compartilhe o processo com outro setor/usuário.
2. ✅ Esperado: sigilosos seguem mascarados.

### 72–73. Edição protegida / novos itens sigilosos
1. Tente editar um sigiloso como não autorizado → bloqueado.
2. ✅ Esperado: novos textos/anexos sigilosos mantêm a proteção.

### 74. Protegido fora do processo
1. Gere o **CSV de protocolos** (Relatórios).
2. ✅ Esperado: o campo sigiloso sai como `••• (sigiloso)`.

---

## Módulo 6 — Caixas, tramitação e visualizações (75–94)

### 75. Caixas recebidos/enviados/rascunhos
1. Veja as abas **Recebidos/Enviados** (Caixa de Entrada) e rascunhos.

### 76. Recebidos
1. Menu **Caixa de Entrada**.
2. ✅ Esperado: lista dos processos recebidos.

### 77. Enviados
1. Menu **Meus Processos**.
2. ✅ Esperado: processos que você criou.

### 78. Colunas (nº, assunto, requerente, datas)
1. Na Caixa de Entrada, veja as colunas de protocolo.

### 79. Todos os criados
1. **Meus Processos** lista todos os criados.

### 80. Tramitação unilateral
1. Abra um processo → seção **Tramitação** → escolha um setor em "Encaminhar para o setor" → **Encaminhar**.
2. ✅ Esperado: "Processo encaminhado para X" e o "Setor atual" muda.

### 81. Tramitação a múltiplas partes
1. Em "Dar ciência a vários setores", marque setores → **Compartilhar ciência**.

### 82. Ver setores do usuário
1. Na Caixa de Entrada, abra o **dropdown de setor**.

### 83. Selecionar setores principais
1. Use o filtro de setor na Inbox.

### 84. Caixa por setor
1. Alterne **Recebidos/Enviados** por setor.

### 85. Caixa padrão por setor
1. Selecione um setor; recarregue.
2. ✅ Esperado: a seleção é lembrada.

### 86. Filtrar por status
1. Use o filtro de **status** na Inbox.

### 87. Filtros múltiplos
1. Combine status + assunto + busca.

### 88. Busca por palavra-chave
1. Digite no campo de busca da Inbox.

### 89. Ordenação
1. Clique nos cabeçalhos para ordenar por data/alfabética.

### 90–94. Visualizações personalizadas
1. Na Inbox, crie uma **visualização** (escolha colunas + estilo: zebra/compacto/bordas/hover).
2. Salve; escolha na **lista suspensa** de visualizações.
3. ✅ Esperado: estilos combináveis livremente, sem programar.

---

## Módulo 7 — Despachos em timeline (95–108)

### 95. Timeline de despachos
1. Abra um processo → seção **Despachos (timeline)**.
2. ✅ Esperado: interface distinta da análise.

### 96. Config de tipos de despacho
1. Admin → **Despachos** → **Novo/Editar** (nome, uso, habilitar, formulário, situações).

### 97. Formulário do tipo no-code
1. No tipo, adicione campos (texto/rich-text/multiselect/select/número/data/arquivo), situações com **cor** e extensões por campo de arquivo.

### 98. Tipos habilitados por assunto
1. Admin → **Assuntos** → marque "Tipos de despacho habilitados".

### 99. Despachos cronológicos
1. Na timeline, os despachos aparecem em ordem de data.

### 100. Regras dos campos
1. Ao despachar, obrigatórios/somente-leitura/extensões são aplicados.

### 101. Alterar tipo sem afetar feitos
1. Edite o tipo de despacho.
2. ✅ Esperado: despachos já feitos mantêm o snapshot original.

### 102. Criar despacho
1. Na timeline, escolha o **tipo**, preencha os campos, selecione a **situação** → salvar.

### 103–106. Retificar/Republicar/Atualizar
1. Num despacho existente, clique **Retificação/Republicação/Atualização**.
2. Preencha **justificativa** e (opcional) anexo → confirmar.
3. ✅ Esperado: novo despacho com data/usuário/tipo e título "original – Retificado/Republicado/Atualizado".

### 107. Impede novo ajuste em ajustado
1. Tente ajustar o mesmo despacho duas vezes.
2. ✅ Esperado: bloqueado.

### 108. Ajuste vira ato na íntegra
1. Gere a íntegra após um ajuste.
2. ✅ Esperado: o ajuste aparece como nova folha cronológica.

---

## Módulo 8 — Íntegra processual (109–114)

### 109. Gerar íntegra
1. No processo, clique **Íntegra do processo** → **Baixar PDF**.

### 110. Atos que compõem
1. ✅ Esperado: abertura, movimentos, análises, despachos, taxas e documentos.

### 111. Uma folha por ato, numerada
1. ✅ Esperado: cada ato em página própria ("Folha N").

### 112. Capa automática
1. ✅ Esperado: capa com brasão, QR, nº de autuação e data.

### 113. Escolha de atos + ZIP
1. No painel da íntegra, **marque os tipos de ato**.
2. **Baixar PDF** (filtra) ou **Baixar ZIP** (íntegra + PDFs dos documentos).

### 114. Sem limite de emissões
1. Gere a íntegra várias vezes.
2. ✅ Esperado: sem restrição.

---

## Módulo 9 — Reaproveitamento e análise de PDF (115–125)

### 115. Reaproveitar do mesmo titular
1. Protocole um assunto **vinculado** (ex.: Renovação de Alvará) e selecione o processo deferido.
2. ✅ Esperado: os dados do processo vinculado vêm preenchidos.

### 116. Revisar/editar reaproveitados
1. Edite os campos pré-preenchidos antes de enviar.

### 117. Compatível com outros módulos
1. ✅ Esperado: dados reaproveitados (quadro de áreas, localização) integram-se ao novo processo.

### 118. Confirmar criação reutilizada
1. Conclua o protocolo de renovação.

### 119. Análise de PDF na interface
1. Abra o **visualizador de PDF** de um anexo.
2. Use medição, escala, área, caneta e comentários.

### 120. Substituição de pranchas (deferido) + justificativa
1. Num processo **deferido**, envie a prancha revisada + justificativa.

### 121. Mantém status/data + notifica analista
1. ✅ Esperado: status/data de deferimento preservados; analista notificado.

### 122. Analista decide
1. Como analista: **Confirmar / Solicitar revisão / Recusar** (com justificativa).

### 123. Marcação "Prancha Substituída" + histórico
1. ✅ Esperado: a prancha antiga fica marcada como substituída, com histórico.

### 124. Substituídas vs vigentes
1. ✅ Esperado: distinção visual entre substituída e vigente.

### 125. Recusa notifica requerente
1. Recuse com justificativa.
2. ✅ Esperado: requerente notificado com o motivo.

---

## Módulo 10 — Análise por checklist e aceites (126–139)

### 126. Checklist de análise
1. Analista → abra um processo → área de **análise** com checklist.

### 127. Área de análise configurável
1. Admin → **Assuntos** → configure os itens do checklist (com campos obrigatórios).

### 128. Item vinculado a campo
1. ✅ Esperado: cada item do checklist mostra o campo do formulário relacionado.

### 129. Requerente vê o analisado
1. Como requerente, abra o processo.
2. ✅ Esperado: as análises aparecem em modo leitura.

### 130. Motivo de encerramento/desarquivamento
1. Ao **Arquivar** ou **Reabrir**, informe o motivo (obrigatório).

### 131. Tela de status do aceite
1. Abra o painel de **aceites** do processo.
2. ✅ Esperado: lista dos envolvidos e status.

### 132. E-mails de aceite com link
1. Dispare um aceite/convite.
2. ✅ Esperado: e-mail enviado (verificar em **Notificações**).

### 133. Envolvido visualiza info
1. Pelo painel de aceites, o envolvido acessa o processo.

### 134. Termo de responsabilidade
1. No aceite, marque o **termo** antes de confirmar.
2. ✅ Esperado: sem o termo, não conclui.

### 135. 100% de aceites → avança
1. Complete todos os aceites.
2. ✅ Esperado: o processo é encaminhado automaticamente.

### 136. Config de prazos e ações
1. No processo, painel de **ações programadas** → defina prazo e ação.

### 137. Ação após decurso do prazo
1. Ao vencer o prazo, a ação (deferir/notificar) é executada.

### 138. Identificação visual de ações programadas
1. ✅ Esperado: processos com ação programada mostram o badge **⏰ ação programada**.

### 139. Campos corrigíveis pelo requerente
1. Na **devolução**, o analista marca (multiselect) quais campos o requerente pode corrigir.

---

## Módulo 11 — Vínculo e status de processos/documentos (140–158)

### 140. Vincular processo novo a existente
1. Na renovação, selecione o processo a renovar.

### 141. Vínculo por busca (nº/código)
1. Busque pelo **número** na tela de renovação.

### 142. Vincular tipos diferentes
1. ✅ Esperado: habite-se ↔ alvará (genérico).

### 143. Validar dados + situação
1. ✅ Esperado: ao vincular, valida os dados e exige processo **DEFERIDO**.

### 144. Só deferidos elegíveis
1. ✅ Esperado: a busca de vínculo traz apenas deferidos.

### 145. Reutilizar informações do vinculado
1. ✅ Esperado: merge dos dados do processo vinculado.

### 146. Despacho com status evoluindo
1. Num despacho, clique **Avançar status**.
2. ✅ Esperado: segue a ordem das situações.

### 147–148. Coluna Status configurável (inserir/ver/reorganizar)
1. Admin → **Despachos** → nas situações: **inserir**, ver na tabela e **reordenar** (setas), definir **cor**.

### 149. Cor por status
1. ✅ Esperado: cada situação tem cor.

### 150. Status evidenciado
1. Na timeline, o status atual aparece colorido.

### 151–152. Justificativa/infos + status atual
1. ✅ Esperado: cada despacho guarda values/justificativa e a situação.

### 153. Central de vencimentos
1. Menu **Documentos** (central com validades).

### 154. Contador de documentos
1. ✅ Esperado: total de documentos exibido.

### 155. Períodos de vencimento
1. Em Documentos, defina a **validade** de um documento.

### 156. Infos do documento
1. ✅ Esperado: número, emissor, data, situação, posse, validade, processo e tipo.

### 157. Renovado/Não renovado/Reverter
1. Em Documentos, defina o **estado** + observação.

### 158. Histórico do documento
1. ✅ Esperado: data/hora, **usuário responsável**, ação (renovado/não renovado/reversão) e observação.

---

## Módulo 12 — SISOBRA (159–169)

### 159. Geração de lote (sucesso/erro)
1. Analista → menu **SISOBRA** → **Gerar novo lote**.
2. ✅ Esperado: lote com os alvarás deferidos não enviados; mostra sucesso e erro.

### 160. Etapas (certificado, revisão, transmitir/baixar)
1. ✅ Esperado: marque "Usar certificado A1", revise a lista, **Transmitir** ou **Baixar XML**.

### 161–162. Corrigir erro de XML
1. Num item "Erro XML — Inscrição imobiliária ausente", preencha a inscrição no campo **Correção** → **Corrigir**.
2. ✅ Esperado: só integra após corrigir.

### 163. Transmitir lote parcial
1. Clique **Transmitir**.
2. ✅ Esperado: envia só os válidos; mensagem "N documento(s) transmitido(s)".

### 164–165. Retransmissão
1. ✅ Esperado: não transmitidos/erro seguem disponíveis para retransmitir.

### 166. Histórico de retransmissões
1. Seção **Histórico de processamento**.

### 167. Status por documento
1. ✅ Esperado: badge Gerado / Erro XML / Transmitido.

### 168. Agrupamento por mês
1. ✅ Esperado: lotes agrupados por "Mês de referência".

### 169. Histórico completo
1. ✅ Esperado: logs de geração/transmissão.

---

## Módulo 13 — Integrações externas / webservices (170–182)

### 170. Config + consulta em tempo real
1. Menu **Integrações** → cadastrar → **Executar** (teste).

### 171. REST GET
1. Método **GET** na integração.

### 172–173. Auth (nenhuma/Basic/OAuth2)
1. No cadastro, escolha o tipo de auth; para OAuth2 preencha Client ID/Secret, Token URL, Scope, Grant Type.

### 174. Corpo Nenhum/Raw JSON
1. Defina **bodyType** (Nenhum ou Raw JSON) e o corpo.

### 175. Headers chave-valor
1. Adicione **headers**.

### 176. Validação por webservice
1. Admin → **Assuntos** → configure validação de campo por integração (valida no blur).

### 177–178. Gerência (URL/método/título/descrição)
1. Tudo na tela de **Integrações**.

### 179. Importar de banco externo
1. Admin → **Importar** → cole o JSON de processos legados → **Importar**.

### 180. Preenchimento por webservice
1. Configure autofill por integração; no protocolo, preenche automaticamente.

### 181. Integração SIG por evento
1. Admin → **Assuntos** → gatilhos (protocolo/deferimento) que disparam a integração.

### 182. Processamento distribuído
1. ✅ Esperado: cada requisição executa a integração de forma independente.

---

## Módulo 14 — Relatórios (183–188)

### 183. Relatório do processo
1. Abra um processo → **Relatório do processo** → **Gerar relatório (PDF)**.

### 184. Personalizar informações
1. Marque as seções (histórico/análises/despachos/documentos) antes de gerar.

### 185. Escolher versão dos dados
1. Selecione a **versão** (snapshot de uma correção) no relatório.

### 186. Versionamento/pareceres/histórico/anexos
1. ✅ Esperado: seções incluídas no PDF.

### 187. CSV por assunto
1. Menu **Relatórios** → baixar **protocols.csv**.

### 188. PDF de desempenho
1. Menu **Relatórios** → baixar **performance.pdf**.

---

## Módulo 15 — Documentos oficiais e assinatura (189–204)

### 189. Geração automática
1. Analista → abra um processo → faça a análise → **Deferir**.
2. ✅ Esperado: alvará/certidão emitido automaticamente.

### 190. Personalização (emblema/fonte/numeração)
1. Admin → **Assuntos** → configure emblema/órgão/fonte/prefixo do documento.

### 191–192. Autenticadores (QR/URL/nº/validador)
1. Abra o PDF do documento.
2. ✅ Esperado: QR Code, URL único, nº do processo em destaque e código validador.
3. Abra o link do QR → valida a autenticidade publicamente.

### 193. Aguardando/Pendente/Publicados
1. Menu **Documentos** → abas por assinatura/status.

### 194. Público/privado
1. Em Documentos, marque a **visibilidade** do documento.

### 195. Ver todos emitidos
1. Menu **Documentos** lista todos.

### 196–197. Ações (retificar/suspender/cancelar/reabrir)
1. Na tela do documento, escolha a ação e informe a **justificativa**.

### 198. Detalhes após cancelamento
1. ✅ Esperado: histórico mostra ação, data e responsável.

### 199. Tarja "Cancelado" + download
1. Cancele um documento e baixe o PDF.
2. ✅ Esperado: PDF com **tarja** de situação.

### 200–201. Reversão + detalhes
1. Num documento cancelado, clique **Reverter cancelamento** (com justificativa).
2. ✅ Esperado: o histórico exibe **data/hora, responsável e justificativa** da reversão.

### 202. Assinatura A1 ICP-Brasil
1. Na tela do documento, clique **Assinar**.
2. ✅ Esperado: assinado com o certificado A1 real (PAdES).

### 203. Gestão de assinaturas (lote, PAdES)
1. Menu **Documentos** → selecione vários → **Assinar em lote**.

### 204. Minhas/Solicitadas/Todas
1. Em Documentos, alterne os **3 escopos** de assinatura.

---

## Módulo 16 — Inteligência Artificial (205–214)

### 205–206. Upload com análise por IA
1. No processo, seção **Conferência documental (IA)** → **Escolher Arquivo** (imagem ou PDF do documento).
2. ✅ Esperado: a IA analisa o documento enviado.

### 207. Documento esperado
1. Preencha **Tipo esperado** (ex.: `RG`).
2. ✅ Esperado: a IA indica se o documento corresponde ao esperado.

### 208. Extrair e preencher
1. ✅ Esperado: a IA extrai nome/CPF/RG etc. (pode preencher o formulário).

### 209. Feedback de precisão
1. Após o resultado, clique **👍** ou **👎**.
2. ✅ Esperado: feedback registrado.

### 210. Extrair de RG/CNH/CNPJ/matrícula/certidão/contrato
1. Envie o documento correspondente.
2. ✅ Esperado: dados extraídos conforme o tipo.

### 211. Atalho do Agente na tela de despachos
1. Na timeline de despachos, clique **🤖 Agente de IA**.

### 212. Janela do Agente com sugestões
1. ✅ Esperado: painel com os agentes disponíveis.

### 213. Agente consulta processo e cria despacho
1. Escolha um agente → **Executar**.
2. ✅ Esperado: gera conteúdo baseado no processo; botão **Usar como despacho**.

### 214. Agentes "Análise de Férias" e "Minuta de TR"
1. ✅ Esperado: ambos disponíveis no painel do Agente.

---

## Módulo 17 — Gestão de taxas (215–224)

### 215. Central de taxas
1. Menu **Taxas**.

### 216. Valor/processo/descrição/situação
1. ✅ Esperado: colunas na lista de taxas.

### 217. Anexar boleto + captura do valor
1. Anexe um **boleto** a uma guia.
2. ✅ Esperado: a IA captura o valor automaticamente.

### 218. Inserir guias no processo
1. No processo, adicione uma **taxa/guia**.

### 219. Guias ao requerente + comprovante
1. ✅ Esperado: o requerente vê a guia e anexa o comprovante.

### 220. Atualizar status
1. Marque a guia como **paga/aguardando/cancelada**.

### 221–222. Cálculo automático
1. Clique **Calcular**.
2. ✅ Esperado: aplica as regras (por uso/área/variáveis).

### 223–224. Condicionar análise ao pagamento
1. Tente iniciar a análise com a taxa pendente.
2. ✅ Esperado: a análise só inicia após a comprovação do pagamento.

---

> **Cenários prontos em produção** para agilizar a banca: processos **2026/000018** (alvará ALV-2026/00006, SISOBRA transmite direto) e **2026/000019** (ALV-2026/00007, com Erro XML para praticar a correção). Sob demanda, é possível semear novos cenários (processo deferido, taxas pendentes, documento assinado, etc.).
