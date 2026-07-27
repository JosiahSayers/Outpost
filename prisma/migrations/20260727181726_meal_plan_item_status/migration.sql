-- CreateTable
CREATE TABLE "MealPlanItemPackingStatus" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "packed" BOOLEAN NOT NULL DEFAULT false,
    "mealPlanItemId" TEXT NOT NULL,

    CONSTRAINT "MealPlanItemPackingStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanItemPackingStatus_mealPlanItemId_key" ON "MealPlanItemPackingStatus"("mealPlanItemId");

-- AddForeignKey
ALTER TABLE "MealPlanItemPackingStatus" ADD CONSTRAINT "MealPlanItemPackingStatus_mealPlanItemId_fkey" FOREIGN KEY ("mealPlanItemId") REFERENCES "MealPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
