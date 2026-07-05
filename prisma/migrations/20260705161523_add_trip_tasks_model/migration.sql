-- CreateEnum
CREATE TYPE "TripTaskPhase" AS ENUM ('before', 'during', 'after');

-- CreateTable
CREATE TABLE "TripTask" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "complete" BOOLEAN NOT NULL DEFAULT false,
    "phase" "TripTaskPhase" NOT NULL,
    "dueDate" DATE,
    "tripId" TEXT NOT NULL,

    CONSTRAINT "TripTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TripTask" ADD CONSTRAINT "TripTask_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
