import type { MealPlanMeal } from "../../../generated/prisma/client";

export type ClientMealPlanMeal = Pick<MealPlanMeal, "id" | "mealName">;

export function transform(item: MealPlanMeal): ClientMealPlanMeal {
  return {
    id: item.id,
    mealName: item.mealName,
  };
}
