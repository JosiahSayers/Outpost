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
CREATE TABLE "MealPlanMeal" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "mealName" "MealName" NOT NULL,
    "mealPlanDayId" TEXT NOT NULL,

    CONSTRAINT "MealPlanMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanMealItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "mealId" TEXT NOT NULL,

    CONSTRAINT "MealPlanMealItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanDay_tripId_dayNumber_key" ON "MealPlanDay"("tripId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlanMeal_mealPlanDayId_mealName_key" ON "MealPlanMeal"("mealPlanDayId", "mealName");

-- AddForeignKey
ALTER TABLE "MealPlanDay" ADD CONSTRAINT "MealPlanDay_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanMeal" ADD CONSTRAINT "MealPlanMeal_mealPlanDayId_fkey" FOREIGN KEY ("mealPlanDayId") REFERENCES "MealPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanMealItem" ADD CONSTRAINT "MealPlanMealItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "MealPlanMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
