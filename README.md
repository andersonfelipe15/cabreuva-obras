# Sistema de Aprovação de Projetos e Licenciamento — Cabreúva/SP

Plataforma **SaaS** para gestão eletrônica de processos de aprovação de projetos edilícios,
uso e ocupação do solo e licenciamento ambiental, desenvolvida como Prova de Conceito (POC)
para o **Pregão Eletrônico 47/2026** da Prefeitura Municipal de Cabreúva/SP.

> **Status:** ✅ **224/224 requisitos do Anexo II atendidos (100%)**, testados em produção.
> 🚀 Em produção: **https://app-production-f8bf.up.railway.app**

---

## Stack

| Camada          | Tecnologia                                                        |
|-----------------|-------------------------------------------------------------------|
| Backend         | NestJS + TypeScript                                               |
| Frontend        | React + Vite + TypeScript                                         |
| Banco           | PostgreSQL + JSONB (formulários dinâmicos)                         |
| ORM             | Prisma                                                            |
| Assinatura A1   | node-signpdf / @signpdf + node-forge (PAdES, ICP-Brasil)          |
| Documentos      | pdf-lib + qrcode (geração de PDF, QR, íntegra)                    |
| IA / OCR        | Claude API (`claude-opus-4-8`) — extração documental e agentes    |
| E-mail          | Resend (HTTP API) com fallback SMTP / outbox simulado             |
| Arquivos        | S3 / MinIO (AWS SDK)                                              |
| Deploy          | Railway (serviço único via Docker)                                |

---

## Arquitetura

**Monólito modular** servido como **serviço único**: o backend NestJS expõe a API sob o prefixo
`/api` e serve o build do frontend (SPA React) com fallback de rotas. Um único container roda tudo.

```
backend/   → API NestJS (módulos por domínio) + serve o frontend em produção
frontend/  → SPA React (Vite)
```

Módulos do backend: `auth`, `users`, `roles`, `process-types`, `processes`, `dispatch-types`,
`documents`, `fees`, `files`, `integrations`, `invitations`, `mail`, `reports`, `sisobra`,
`storage`, `workflow`, `ai`.

---

## Funcionalidades

- **Contas e autenticação** — cadastro PF/PJ com validação de CPF/CNPJ e senha forte, confirmação
  por e-mail, "esqueci minha senha", e **autenticação avançada**: certificado digital **ICP-Brasil A1**
  (validação real da cadeia) e **login gov.br** (federado).
- **Perfis e permissões** — perfis de fábrica (Administrador, Analista, Requerente) + criação de
  perfis e permissões granulares pela interface, sem programação.
- **Construtor de formulários no-code** — campos, colunas, ocultos, somente-leitura, fórmulas,
  campos dinâmicos, validações e integração com webservices.
- **Carta de serviços e protocolo** — catálogo de assuntos, protocolo digital com validação.
- **Caixas e tramitação** — recebidos/enviados por setor, filtros, visualizações personalizadas,
  encaminhamento e compartilhamento entre setores.
- **Despachos em timeline** — tipos configuráveis, situações com cor, retificação/republicação.
- **Íntegra processual** — PDF capa a capa com brasão e QR, seleção de atos e download em ZIP.
- **Análise técnica** — checklist configurável, aceites, prazos e ações automáticas.
- **Documentos oficiais** — geração de alvarás/certidões, **assinatura digital A1 em lote (PAdES)**,
  QR de validação pública, ciclo de vida (cancelar/suspender/reverter).
- **SISOBRA** — geração de lote, correção de erros de XML e transmissão.
- **Integrações externas** — REST/webservices (nenhuma/Basic/OAuth2), gatilhos por evento.
- **Relatórios** — do processo (PDF por seções), protocolos (CSV) e desempenho (PDF).
- **Inteligência Artificial** — extração de dados de documentos (RG/CNH/CNPJ...) e agentes que
  consultam o processo e geram minutas de despacho.
- **Gestão de taxas** — guias, boletos, cálculo automático e condicionamento da análise ao pagamento.

---

## Rodando localmente

**Pré-requisitos:** Node.js 20+, PostgreSQL e um arquivo `backend/.env` (veja `backend/.env.example`).

```bash
# 1) Backend
cd backend
npm install
npx prisma migrate dev        # cria o schema
npm run seed                  # popula perfis, setores e contas de demonstração
npm run build && node dist/src/main.js   # API em http://localhost:3000 (prefixo /api)

# 2) Frontend (em outro terminal)
cd frontend
npm install
npm run dev                   # site em http://localhost:5173 (proxy /api → :3000)
```

Documentação Swagger da API em `http://localhost:3000/docs`.

### Contas de demonstração (seed)

| Perfil        | E-mail                        | Senha           |
|---------------|-------------------------------|-----------------|
| Administrador | admin@cabreuva.sp.gov.br      | `admin123`      |
| Analista      | analista@cabreuva.sp.gov.br   | `analista123`   |
| Requerente    | requerente@teste.com          | `requerente123` |

> Contas de teste — **não** são credenciais reais.

### Roteiro rápido de demonstração

1. Entre como **requerente** → **Carta de Serviços** → "Aprovação de Projeto e Alvará" → preencha e **protocole**.
2. Entre como **analista** → **Caixa de Entrada** → abra o processo → **checklist de análise** → **Deferir**.
3. O alvará é emitido com número, **QR Code** e código validador; abra o link de verificação para conferir a autenticidade pública.

---

## Variáveis de ambiente

Configuradas em `backend/.env` (não versionado). Veja `backend/.env.example` para a lista completa.
Principais: `DATABASE_URL`, `JWT_SECRET`, `PUBLIC_URL`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`,
`SIGN_CERT_PATH` / `SIGN_CERT_PASSWORD` (certificado A1), `ALLOW_SIMULATED_SSO`.

> 🔒 Segredos (chaves de API, certificado `.pfx`, senhas) **nunca** vão para o repositório —
> ficam apenas no `.env` local e no painel do Railway.

---

## Deploy

Deploy em **serviço único** no Railway via `Dockerfile` na raiz. Detalhes em
[`DEPLOY-RAILWAY.md`](./DEPLOY-RAILWAY.md).

---

## Documentação

- [`MATRIZ-POC.md`](./MATRIZ-POC.md) — matriz de rastreabilidade dos 224 requisitos do Anexo II.
- [`RESUMO-EXECUTIVO.md`](./RESUMO-EXECUTIVO.md) — resumo executivo.
- [`DEPLOY-RAILWAY.md`](./DEPLOY-RAILWAY.md) — guia de implantação.
