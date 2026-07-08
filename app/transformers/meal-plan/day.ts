import { toDateOnly } from "$/transformers/helpers";
import type {
  MealPlanDay,
  MealPlanMeal,
} from "../../../generated/prisma/browser";
import { transform as mealTransform, type ClientMealPlanMeal } from "./meal";

export type ClientMealPlanDay = Pick<MealPlanDay, "id" | "dayNumber"> & {
  date: string | null;
  meals: ClientMealPlanMeal[];
};

export type FullMealPlanDayInput = MealPlanDay & { meals: MealPlanMeal[] };

export function transform(item: FullMealPlanDayInput): ClientMealPlanDay {
  return {
    id: item.id,
    date: toDateOnly(item.date),
    dayNumber: item.dayNumber,
    meals: item.meals.map(mealTransform),
  };
}
