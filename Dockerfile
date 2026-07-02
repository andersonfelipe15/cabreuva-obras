# Serviço único: compila o frontend e o backend; o backend serve o site + a API.
FROM node:22-slim

WORKDIR /app

# openssl é necessário para o Prisma no Debian slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# ---- Frontend: instalar deps e compilar ----
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci --include=dev
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# ---- Backend: instalar deps, gerar Prisma Client e compilar ----
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --include=dev
COPY backend/ ./backend/
RUN cd backend && npx prisma generate && npm run build

# O backend serve o frontend compilado a partir de ./client
RUN cp -r frontend/dist backend/client

WORKDIR /app/backend
ENV SERVE_CLIENT=true
EXPOSE 3000

# No boot: aplica o schema no Postgres, roda o seed (idempotente) e sobe a API.
CMD ["sh", "-c", "npx prisma db push --skip-generate && (npm run seed || true) && node dist/src/main.js"]
