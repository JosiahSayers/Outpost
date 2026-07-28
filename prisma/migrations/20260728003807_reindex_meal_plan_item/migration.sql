-- DropIndex
DROP INDEX "MealPlanItem_meal_mealPlanDayId_idx";

-- CreateIndex
CREATE INDEX "MealPlanItem_mealPlanDayId_idx" ON "MealPlanItem"("mealPlanDayId");
