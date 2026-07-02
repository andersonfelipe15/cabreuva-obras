-- CreateEnum
CREATE TYPE "IntegrationAuth" AS ENUM ('NONE', 'BASIC', 'OAUTH2');

-- CreateEnum
CREATE TYPE "IntegrationBody" AS ENUM ('NONE', 'RAW_JSON');

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "authType" "IntegrationAuth" NOT NULL DEFAULT 'NONE',
    "authConfig" JSONB,
    "headers" JSONB,
    "bodyType" "IntegrationBody" NOT NULL DEFAULT 'NONE',
    "body" TEXT,
    "titleProp" TEXT,
    "keyProp" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);
