-- CreateEnum
CREATE TYPE "MealName" AS ENUM ('breakfast', 'lunch', 'dinner', 'snacks');

-- CreateTable
CREATE TABLE "MealPlanDay" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "date" DATE,
    "tripId" TEXT NOT NULL,

    CONSTRAINT "MealPlanDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "meal" "MealName" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "waterMl" INTEGER,
    "dryWeightGrams" INTEGER,
    "mealPlanDayId" TEXT NOT NULL,

    CONSTRAINT "MealPlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanDay_tripId_dayNumber_key" ON "MealPlanDay"("tripId", "dayNumber");

-- CreateIndex
CREATE INDEX "MealPlanItem_meal_mealPlanDayId_idx" ON "MealPlanItem"("meal", "mealPlanDayId");

-- AddForeignKey
ALTER TABLE "MealPlanDay" ADD CONSTRAINT "MealPlanDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanItem" ADD CONSTRAINT "MealPlanItem_mealPlanDayId_fkey" FOREIGN KEY ("mealPlanDayId") REFERENCES "MealPlanDay"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
