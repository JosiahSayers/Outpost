-- Rename 'planned' to 'planning' to match how the UI already labels the status
ALTER TYPE "TripStatus" RENAME VALUE 'planned' TO 'planning';

-- Postgres can't reorder enum values in place, so recreate the type with
-- 'in_progress' first: in-progress/started-today trips should sort first
-- on the dashboard.
ALTER TYPE "TripStatus" RENAME TO "TripStatus_old";

CREATE TYPE "TripStatus" AS ENUM ('in_progress', 'planning', 'postponed', 'finished', 'cancelled');

ALTER TABLE "Trip" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Trip" ALTER COLUMN "status" TYPE "TripStatus" USING ("status"::text::"TripStatus");
ALTER TABLE "Trip" ALTER COLUMN "status" SET DEFAULT 'planning';

DROP TYPE "TripStatus_old";
