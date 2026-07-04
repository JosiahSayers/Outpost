-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('planned', 'in_progress', 'postponed', 'finished', 'cancelled');

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'planned',
    "trail" TEXT,
    "location" TEXT,
    "start" TIMESTAMP(3),
    "end" TIMESTAMP(3),
    "userId" TEXT NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Trip_status_start_idx" ON "Trip"("status", "start");

-- CreateIndex
CREATE INDEX "Trip_start_idx" ON "Trip"("start");

-- CreateIndex
CREATE INDEX "Trip_name_trail_location_idx" ON "Trip"("name", "trail", "location");

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
