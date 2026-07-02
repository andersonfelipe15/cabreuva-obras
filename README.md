# Sistema de Aprovação de Projetos e Licenciamento (SaaS)

Plataforma para gestão eletrônica de processos de aprovação de projetos edilícios,
uso e ocupação do solo e licenciamento ambiental — base para o Pregão Eletrônico 47/2026.

## Stack

| Camada     | Tecnologia                                  |
|------------|---------------------------------------------|
| Núcleo     | NestJS + TypeScript                         |
| Banco      | PostgreSQL + JSONB (formulários dinâmicos)  |
| ORM        | Prisma                                      |
| Arquivos   | S3 / MinIO                                  |
| Assíncrono | Redis + BullMQ (a partir do 2º incremento)  |
| Assinatura | node-signpdf (A1 ICP-Brasil)                |
| IA / OCR   | Claude API (visão) chamada direto do Node   |

> Arquitetura: **monólito modular**. Frontend React virá em incremento separado.

## O que já está pronto (Incremento 1)

- **Fundação**
  - Autenticação JWT (login).
  - Perfis de permissionamento (Analista, Requerente, Administrador) + permissões granulares (Módulo IX).
  - Setores/órgãos.
  - Tipos de processo (assuntos) com **construtor de formulário dinâmico** armazenado em JSONB.
- **Módulo I — Aprovação de Projetos Edilícios** (fluxo ponta a ponta)
  - Protocolo digital com validação dos campos obrigatórios contra a definição do formulário.
  - Caixa de entrada (inbox) por setor, com filtros.
  - Tramitação interna (encaminhamento entre setores + despachos).
  - Análise técnica por checklist vinculado ao formulário.
  - Devolução ao requerente para correção.
  - Deferimento / indeferimento.
  - Emissão de documento oficial (Alvará) com QR Code, código validador único e número.

## Como rodar

```bash
# 1. Suba a infraestrutura (Postgres, Redis, MinIO)
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run seed        # cria admin, perfis e o processo do Módulo I
npm run start:dev
```

API em `http://localhost:3000`. Documentação Swagger em `http://localhost:3000/docs`.

```bash
# 3. Frontend (em outro terminal)
cd frontend
npm install
npm run dev          # interface em http://localhost:5173
```

### Roteiro de demonstração (fluxo do Módulo I)

1. Acesse `http://localhost:5173`, entre como **requerente@teste.com / requerente123**.
2. **Carta de Serviços** → "Aprovação de Projeto e Alvará (Construção)" → preencha o formulário → **Revisar e protocolar** → confirme. Anote o número gerado.
3. Saia e entre como **analista@cabreuva.sp.gov.br / analista123**.
4. **Caixa de Entrada** → abra o processo → preencha o **checklist de análise** → **Registrar análise** → **Deferir**.
5. O alvará é emitido com número, QR Code e código validador. Clique no link de verificação para conferir a autenticidade pública.

### Login inicial (seed)

- **admin@cabreuva.sp.gov.br** / `admin123` (Administrador)
- **analista@cabreuva.sp.gov.br** / `analista123` (Analista)
- **requerente@teste.com** / `requerente123` (Requerente)

## Próximos incrementos

1. Frontend React (protocolo externo + inbox + tela de análise).
2. Emissão de PDF real + assinatura A1 (node-signpdf).
3. IA/OCR de documentos via Claude API.
4. Demais módulos (Certidão de Uso do Solo, Renovação, SISOBRA, etc.).
