-- AlterTable
ALTER TABLE "MealPlanItem" ADD COLUMN     "publicMealSourceId" TEXT;

-- CreateTable
CREATE TABLE "PublicMealItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "calories" INTEGER,
    "waterMl" INTEGER,
    "dryWeightGrams" INTEGER,
    "imageId" TEXT,
    "sourceImageUrl" TEXT,
    "sourceVendor" TEXT NOT NULL,
    "sourceProductId" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,

    CONSTRAINT "PublicMealItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "r2Key" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicMealItem_sourceVendor_sourceProductId_key" ON "PublicMealItem"("sourceVendor", "sourceProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Image_r2Key_key" ON "Image"("r2Key");

-- CreateIndex
CREATE INDEX "MealPlanItem_publicMealSourceId_idx" ON "MealPlanItem"("publicMealSourceId");

-- AddForeignKey
ALTER TABLE "MealPlanItem" ADD CONSTRAINT "MealPlanItem_publicMealSourceId_fkey" FOREIGN KEY ("publicMealSourceId") REFERENCES "PublicMealItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicMealItem" ADD CONSTRAINT "PublicMealItem_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
