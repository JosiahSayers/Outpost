import { toDateOnly } from "$/transformers/helpers";
import type {
  MealName,
  MealPlanDay,
  MealPlanMeal,
} from "../../../generated/prisma/browser";
import { transform as mealTransform, type ClientMealPlanMeal } from "./meal";

export type ClientMealPlanDay = Pick<MealPlanDay, "id" | "dayNumber"> & {
  date: string | null;
  meals: Record<MealName, ClientMealPlanMeal>;
};

export type FullMealPlanDayInput = MealPlanDay & { meals: MealPlanMeal[] };

export function transform(item: FullMealPlanDayInput): ClientMealPlanDay {
  return {
    id: item.id,
    date: toDateOnly(item.date),
    dayNumber: item.dayNumber,
    meals: {
      breakfast: getMeal(item.meals, "breakfast"),
      lunch: getMeal(item.meals, "lunch"),
      dinner: getMeal(item.meals, "dinner"),
      snacks: getMeal(item.meals, "snacks"),
    },
  };
}

function getMeal(meals: MealPlanMeal[], mealName: MealName) {
  const meal = meals.find((meal) => meal.mealName === mealName);
  return mealTransform(meal!);
}
