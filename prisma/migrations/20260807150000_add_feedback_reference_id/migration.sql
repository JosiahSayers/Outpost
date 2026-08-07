-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "referenceId" TEXT;

-- Backfill existing rows with a random 6-character code (unambiguous
-- uppercase alphanumeric alphabet, matching app/utils/generate-reference-id.ts).
-- Uses a join against generate_series rather than a per-row scalar subquery
-- so random() is re-evaluated for every (row, series) pair instead of being
-- cached and reused across rows.
WITH codes AS (
  SELECT "id", string_agg(
    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', (random() * 32)::int + 1, 1),
    ''
  ) AS code
  FROM "Feedback", generate_series(1, 6)
  WHERE "referenceId" IS NULL
  GROUP BY "id"
)
UPDATE "Feedback" f
SET "referenceId" = codes.code
FROM codes
WHERE f."id" = codes."id";

-- Enforce NOT NULL for all future inserts (no default, so it must be provided explicitly)
ALTER TABLE "Feedback" ALTER COLUMN "referenceId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_referenceId_key" ON "Feedback"("referenceId");
