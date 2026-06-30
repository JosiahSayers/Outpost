-- DropForeignKey
ALTER TABLE "PackingListItem" DROP CONSTRAINT "PackingListItem_gearCategoryId_fkey";

-- AlterTable
ALTER TABLE "PackingListItem" ALTER COLUMN "gearCategoryId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_gearCategoryId_fkey" FOREIGN KEY ("gearCategoryId") REFERENCES "GearCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
