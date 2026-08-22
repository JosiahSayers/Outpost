-- AlterTable
ALTER TABLE "CommunicationAuditLog" ADD COLUMN     "acknowledgedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PushSubscription" ADD COLUMN     "lastAckedAt" TIMESTAMP(3),
ADD COLUMN     "userAgent" TEXT;

-- CreateIndex
CREATE INDEX "CommunicationAuditLog_to_communicationType_createdAt_idx" ON "CommunicationAuditLog"("to", "communicationType", "createdAt");

-- CreateIndex
CREATE INDEX "PushSubscription_lastAckedAt_idx" ON "PushSubscription"("lastAckedAt");

-- Backfill: treat push notifications sent before this feature existed as
-- neutral (acked at their own send time) rather than permanently
-- "unacknowledged" -- otherwise every pre-existing row would instantly
-- count toward the nightly stale-prune job's unacked threshold.
UPDATE "CommunicationAuditLog" SET "acknowledgedAt" = "createdAt" WHERE "communicationType" = 'push';
