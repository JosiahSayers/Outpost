-- DropForeignKey
ALTER TABLE "TripTask" DROP CONSTRAINT "TripTask_tripId_fkey";

-- AddForeignKey
ALTER TABLE "TripTask" ADD CONSTRAINT "TripTask_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
