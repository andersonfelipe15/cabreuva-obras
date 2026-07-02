-- CreateEnum
CREATE TYPE "SisobraStatus" AS ENUM ('GENERATED', 'XML_ERROR', 'TRANSMITTED', 'TRANSMISSION_ERROR');

-- CreateTable
CREATE TABLE "SisobraBatch" (
    "id" TEXT NOT NULL,
    "referenceMonth" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SisobraBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SisobraDocument" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "processNumber" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "xml" TEXT NOT NULL,
    "sourceData" JSONB NOT NULL,
    "status" "SisobraStatus" NOT NULL DEFAULT 'GENERATED',
    "error" TEXT,
    "transmittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SisobraDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SisobraLog" (
    "id" TEXT NOT NULL,
    "batchId" TEXT,
    "documentId" TEXT,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SisobraLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SisobraDocument" ADD CONSTRAINT "SisobraDocument_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "SisobraBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
