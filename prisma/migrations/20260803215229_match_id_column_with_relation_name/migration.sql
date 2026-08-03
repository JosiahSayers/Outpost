-- DropForeignKey
ALTER TABLE "PackingListItem" DROP CONSTRAINT "PackingListItem_gearInventoryItemId_fkey";

-- AlterTable
ALTER TABLE "PackingListItem" RENAME COLUMN "gearInventoryItemId" TO "assignedGearId";

-- AddForeignKey
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_assignedGearId_fkey" FOREIGN KEY ("assignedGearId") REFERENCES "GearInventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
