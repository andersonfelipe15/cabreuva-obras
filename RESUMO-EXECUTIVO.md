# Resumo Executivo — POC Sistema de Aprovação de Projetos e Licenciamento
**Pregão Eletrônico 47/2026 — Prefeitura de Cabreúva/SP**

## 1. Visão geral

Sistema web para protocolo, análise, tramitação, deferimento e emissão de documentos
oficiais (alvarás/certidões) de obras e licenciamento ambiental, com construtor de
formulários **no-code**, assinatura digital **ICP-Brasil (A1/PAdES)**, IA para conferência
documental e integrações externas configuráveis.

- **Cobertura do Anexo II:** **224/224 requisitos "Atende" (100%)** — 0 parciais, 0 pendentes.
- **Validação:** cada lote foi testado com scripts **e2e reais** contra a API viva + PostgreSQL
  (não apenas compilação). ~150 asserções no total.
- **Rastreabilidade:** `MATRIZ-POC.md` mapeia item a item (nº do requisito → arquivo/rota + "testado").

### Stack
| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Banco | PostgreSQL + Prisma (JSONB para formulários dinâmicos) |
| Frontend | React + Vite + TypeScript |
| Assinatura | @signpdf / node-signpdf (PAdES, certificado A1) |
| PDF/QR | pdf-lib + qrcode |
| IA | @anthropic-ai/sdk (Claude, modelo `claude-opus-4-8`) |
| E-mail | nodemailer (SMTP) |
| Arquivos | @aws-sdk/client-s3 (MinIO/S3) com fallback em disco |
| Pacotes | jszip (ZIP de atos) |

## 2. Módulos entregues (e o que cada um demonstra)

| Módulo | Destaques |
|---|---|
| **I — Aprovação de Projetos** | protocolo digital, formulários dinâmicos, quadro de áreas (glebas, geo, total) |
| **II — Construtor no-code** | editor de assuntos: seções, campos (texto, seleção, anexo, `partes`, `repeater`, fórmula), regras (min/máx, proibidos, cruzamento), gatilhos, fórmulas, sigilosos |
| **III — Permissionamento** | perfis configuráveis, permissões por perfil, protocolo restrito por perfil, perfil ativo alternável sem novo login |
| **IV — Usuários** | busca, pré-cadastro, convites (interno/externo), auto-cadastro, status (Férias/Licença) + **substituto automático**, histórico/auditoria |
| **V — Tramitação** | caixas Recebidos/Enviados/Rascunhos por setor, encaminhamento unilateral, ciência a múltiplos setores |
| **VI — Análise técnica** | checklist vinculado a campos, devolução com campos corrigíveis, taxas obrigatórias antes da análise |
| **VII — Decisão/Documentos** | deferir/indeferir, emissão automática com QR + validador + numeração, personalização (emblema/fonte), ciclo de vida (suspender/cancelar/chancelar), central de assinaturas (Minhas/Solicitadas/Todas + lote) |
| **VIII — Despachos** | timeline, tipos configuráveis no-code, situações com cor e **evolução de status**, ajuste (retificação) com anexo, íntegra em PDF |
| **IX — Aceites e prazos** | aceites com termo + e-mail com link, avanço automático a 100%, ações programadas por prazo |
| **X — Relatórios** | dashboard, CSV (com mascaramento de sigilosos), relatório do processo por seção/versão, desempenho |
| **XI — Integrações** | webservices configuráveis, autofill/validação por campo, gatilhos SIG por evento, SISOBRA (lote), importação de legado |
| **XII — IA/OCR** | conferência documental, extração para autofill, captura de valor de boleto, agentes de despacho, feedback de precisão |
| **Auth avançada** | esqueci-minha-senha (token), gov.br / certificado ICP-Brasil (federado) |
| **Notificações** | e-mail SMTP + caixa de saída auditável (aceite, convite, reset, prazo) |

## 3. Roteiro de demonstração (sugestão, ~15 min)

**Contas de teste:** `admin@cabreuva.sp.gov.br` / `analista@cabreuva.sp.gov.br` / `requerente@teste.com`
(senhas do seed).

1. **Requerente** → *Criar conta* (auto-cadastro) → **Carta de Serviços** (só assuntos permitidos) →
   protocola uma **Construção**: preenche o formulário dinâmico (autofill de CEP, quadro de áreas com
   total/geo), salva **rascunho**, revisa e protocola.
2. **Analista** → **Caixa de Entrada** (aba Recebidos, visualização personalizada) → abre o processo →
   **Tramitação** (encaminhar/dar ciência) → **Taxas** (paga) → **Análise técnica** (checklist) →
   **Despachos** (timeline, avançar status, Agente de IA) → **Devolve** marcando campos corrigíveis.
3. **Analista/Admin** → **Defere** → documento oficial emitido (PDF com QR, emblema, numeração `ALV-…`) →
   **assina (A1)** → **Central de Assinaturas** → **pacote ZIP de atos**.
4. **Verificação pública** → abrir `/verificar/<código>` (autenticidade + QR).
5. **Admin** → **Assuntos** (construtor no-code) → **Despachos** (tipos/situações) → **Usuários**
   (status + substituto, histórico) → **Notificações** (caixa de saída) → **Importar** (legado) →
   **Relatórios** (dashboard + CSV com sigiloso mascarado).

## 4. Checklist de variáveis de ambiente (produção)

Arquivo `backend/.env` (gitignored). **Não** cole segredos no chat/código — use secret manager.

### Obrigatórias
| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | conexão PostgreSQL | `postgresql://user:pass@host:5432/licenciamento` |
| `JWT_SECRET` | segredo de assinatura do JWT (forte, aleatório) | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | validade do token | `8h` |
| `PUBLIC_URL` | URL pública do app (links de e-mail/QR) | `https://licenciamento.cabreuva.sp.gov.br` |
| `PORT` | porta da API | `3000` |

### Assinatura digital ICP-Brasil (Módulo X)
| Variável | Descrição |
|---|---|
| `SIGN_CERT_PATH` | caminho do certificado **A1** (`.pfx`/`.p12`) — fora do repo, em `certs/` |
| `SIGN_CERT_PASSWORD` | senha do certificado A1 |

### IA / OCR (Módulo XII)
| Variável | Descrição |
|---|---|
| `ANTHROPIC_API_KEY` | chave da API Claude (least-privilege, rotacionável) |
| `ANTHROPIC_MODEL` | modelo (padrão `claude-opus-4-8`) |

### E-mail (Módulo IX/notificações)
| Variável | Descrição | Exemplo |
|---|---|---|
| `SMTP_HOST` | servidor SMTP (sem isto, e-mails ficam "simulado" na caixa de saída) | `smtp.cabreuva.sp.gov.br` |
| `SMTP_PORT` | porta | `587` |
| `SMTP_SECURE` | TLS implícito (`true`/`false`) | `false` |
| `SMTP_USER` / `SMTP_PASS` | credenciais SMTP | |
| `SMTP_FROM` | remetente | `nao-responder@cabreuva.sp.gov.br` |

### Armazenamento de anexos
| Variável | Descrição |
|---|---|
| `STORAGE_DRIVER` | `s3` (MinIO/S3) ou vazio (disco local) |
| `S3_ENDPOINT` / `S3_REGION` / `S3_BUCKET` | destino |
| `S3_ACCESS_KEY` / `S3_SECRET_KEY` | credenciais |

### Autenticação avançada
| Variável | Descrição |
|---|---|
| `ALLOW_SIMULATED_SSO` | `false` em produção para **desligar** o login gov.br/ICP simulado até integrar o provedor real |

## 5. Notas "simulado → produção" (funcionam com config, sem mudar código)

- **gov.br / ICP-Brasil:** stub federado atrás de `ALLOW_SIMULATED_SSO`. Em produção, integrar OIDC gov.br /
  validação da cadeia ICP e manter a flag `false` até então.
- **E-mail:** sem `SMTP_*`, os envios ficam registrados como "simulado" na caixa de saída; preencher as
  variáveis ativa o envio real.
- **Integrações externas / SIG:** os endpoints mock são substituídos pela URL real na tela de Integrações.
- **Assinatura A1:** apontar `SIGN_CERT_PATH`/`SIGN_CERT_PASSWORD` para o certificado real.
- **SISOBRA/Receita:** requer a licença/credenciais oficiais para o envio real (pipeline pronto).

## 6. Como executar

```bash
# Backend
cd backend
cp .env.example .env          # preencher as variáveis acima
npx prisma migrate deploy     # (ou: npx prisma db push em POC)
npx prisma db seed            # dados de teste (perfis, usuários, assuntos)
npm run build && node dist/src/main.js

# Frontend
cd frontend
npm run build                 # gera dist/ (servir atrás do mesmo host, proxy /api → backend)
```

---
*POC entregue com 224/224 requisitos do Anexo II atendidos e validados por testes e2e.*
