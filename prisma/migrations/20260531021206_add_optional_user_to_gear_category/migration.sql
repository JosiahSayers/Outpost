-- AlterTable
ALTER TABLE "GearCategory" ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "GearCategory" ADD CONSTRAINT "GearCategory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
