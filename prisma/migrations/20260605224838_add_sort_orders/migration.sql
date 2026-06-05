/*
  Warnings:

  - Added the required column `sortPosition` to the `PackingListItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sortPosition` to the `PackingListSection` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "PackingListItem" DROP CONSTRAINT "PackingListItem_packingListSectionId_fkey";

-- DropForeignKey
ALTER TABLE "PackingListSection" DROP CONSTRAINT "PackingListSection_packingListId_fkey";

-- AlterTable
ALTER TABLE "PackingListItem" ADD COLUMN     "sortPosition" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "PackingListSection" ADD COLUMN     "sortPosition" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "PackingListSection" ADD CONSTRAINT "PackingListSection_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_packingListSectionId_fkey" FOREIGN KEY ("packingListSectionId") REFERENCES "PackingListSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
