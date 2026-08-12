-- CreateTable
CREATE TABLE "IgnoredPublicMealItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sourceVendor" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "ignoredById" TEXT NOT NULL,

    CONSTRAINT "IgnoredPublicMealItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IgnoredPublicMealItem_sourceVendor_sourceProductId_key" ON "IgnoredPublicMealItem"("sourceVendor", "sourceProductId");

-- AddForeignKey
ALTER TABLE "IgnoredPublicMealItem" ADD CONSTRAINT "IgnoredPublicMealItem_ignoredById_fkey" FOREIGN KEY ("ignoredById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
