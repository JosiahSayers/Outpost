import { toDateOnly } from "$/transformers/helpers";
import type { MealPlanDay } from "../../../generated/prisma/browser";

export type ClientMealPlanDay = Pick<MealPlanDay, "id" | "dayNumber"> & {
  date: string | null;
};

export function transform(item: MealPlanDay): ClientMealPlanDay {
  return {
    id: item.id,
    date: toDateOnly(item.date),
    dayNumber: item.dayNumber,
  };
}
