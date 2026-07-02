-- CreateEnum
CREATE TYPE "SubstitutionStatus" AS ENUM ('PENDING', 'REVISION_REQUESTED', 'CONFIRMED', 'REJECTED');

-- CreateTable
CREATE TABLE "PlankSubstitution" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "fieldKey" TEXT,
    "oldFileId" TEXT,
    "newFileId" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "status" "SubstitutionStatus" NOT NULL DEFAULT 'PENDING',
    "decisionReason" TEXT,
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlankSubstitution_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlankSubstitution" ADD CONSTRAINT "PlankSubstitution_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
