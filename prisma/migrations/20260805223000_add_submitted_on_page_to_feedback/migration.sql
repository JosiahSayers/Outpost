-- AlterTable
ALTER TABLE "Feedback" ADD COLUMN "submittedOnPage" TEXT;

-- Backfill existing rows
UPDATE "Feedback" SET "submittedOnPage" = 'unknown' WHERE "submittedOnPage" IS NULL;

-- Enforce NOT NULL for all future inserts (no default, so it must be provided explicitly)
ALTER TABLE "Feedback" ALTER COLUMN "submittedOnPage" SET NOT NULL;
