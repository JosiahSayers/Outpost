-- CreateEnum
CREATE TYPE "CommunicationType" AS ENUM ('email');

-- CreateTable
CREATE TABLE "CommunicationAuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "communicationType" "CommunicationType" NOT NULL,
    "from" TEXT,
    "to" TEXT NOT NULL,
    "thirdPartyId" TEXT,
    "subject" TEXT,
    "content" TEXT,
    "initiatedByUserId" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "CommunicationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunicationAuditLog_userId_createdAt_idx" ON "CommunicationAuditLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationAuditLog_initiatedByUserId_createdAt_idx" ON "CommunicationAuditLog"("initiatedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationAuditLog_communicationType_createdAt_idx" ON "CommunicationAuditLog"("communicationType", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationAuditLog_subject_createdAt_idx" ON "CommunicationAuditLog"("subject", "createdAt");

-- CreateIndex
CREATE INDEX "CommunicationAuditLog_createdAt_idx" ON "CommunicationAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "CommunicationAuditLog" ADD CONSTRAINT "CommunicationAuditLog_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunicationAuditLog" ADD CONSTRAINT "CommunicationAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
