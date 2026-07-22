-- CreateEnum
CREATE TYPE "ProtectedAreaCategory" AS ENUM ('fee', 'designation', 'easement', 'proclamation', 'marine');

-- CreateEnum
CREATE TYPE "ProtectedAreaIngestStatus" AS ENUM ('running', 'succeeded', 'failed');

-- CreateTable
CREATE TABLE "ProtectedArea" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceUniqueId" TEXT NOT NULL,
    "unitName" TEXT NOT NULL,
    "localName" TEXT,
    "category" "ProtectedAreaCategory" NOT NULL,
    "managerType" TEXT,
    "managerName" TEXT,
    "ownerType" TEXT,
    "ownerName" TEXT,
    "designationType" TEXT,
    "localDesignation" TEXT,
    "gapStatus" TEXT,
    "iucnCategory" TEXT,
    "publicAccess" TEXT,
    "dateEstablished" INTEGER,
    "acres" DOUBLE PRECISION,
    "aggregatorSource" TEXT NOT NULL,
    "wdpaCode" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "ProtectedArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtectedAreaIngestRun" (
    "id" TEXT NOT NULL,
    "jobId" TEXT,
    "source" TEXT NOT NULL,
    "status" "ProtectedAreaIngestStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsCreated" INTEGER NOT NULL DEFAULT 0,
    "itemsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "initiatedByUserId" TEXT,

    CONSTRAINT "ProtectedAreaIngestRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProtectedArea_sourceUniqueId_key" ON "ProtectedArea"("sourceUniqueId");

-- CreateIndex
CREATE INDEX "ProtectedArea_unitName_idx" ON "ProtectedArea"("unitName");

-- CreateIndex
CREATE INDEX "ProtectedArea_state_idx" ON "ProtectedArea"("state");

-- CreateIndex
CREATE INDEX "ProtectedAreaIngestRun_status_startedAt_idx" ON "ProtectedAreaIngestRun"("status", "startedAt");

-- AddForeignKey
ALTER TABLE "ProtectedAreaIngestRun" ADD CONSTRAINT "ProtectedAreaIngestRun_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
