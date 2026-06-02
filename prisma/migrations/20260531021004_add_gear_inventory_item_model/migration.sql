-- CreateTable
CREATE TABLE "GearInventoryItem" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "gearCategoryId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "GearInventoryItem_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GearInventoryItem" ADD CONSTRAINT "GearInventoryItem_gearCategoryId_fkey" FOREIGN KEY ("gearCategoryId") REFERENCES "GearCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GearInventoryItem" ADD CONSTRAINT "GearInventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
