import { toDateOnly } from "$/transformers/helpers";
import type {
  MealName,
  MealPlanDay,
} from "../../../generated/prisma/browser";
import {
  transform as itemTransform,
  type ClientMealPlanItem,
  type MealPlanDayItemInput,
} from "./item";

const MEAL_NAMES: MealName[] = ["breakfast", "lunch", "dinner", "snacks"];

export type ClientMealPlanDay = Pick<MealPlanDay, "id" | "dayNumber"> & {
  date: string | null;
  meals: Record<MealName, ClientMealPlanItem[]>;
};

export type FullMealPlanDayInput = MealPlanDay & {
  items: MealPlanDayItemInput[];
};

export function transform(item: FullMealPlanDayInput): ClientMealPlanDay {
  return {
    id: item.id,
    date: toDateOnly(item.date),
    dayNumber: item.dayNumber,
    meals: Object.fromEntries(
      MEAL_NAMES.map((mealName) => [mealName, getItems(item.items, mealName)]),
    ) as Record<MealName, ClientMealPlanItem[]>,
  };
}

function getItems(items: MealPlanDayItemInput[], mealName: MealName) {
  return items
    .filter((dayItem) => dayItem.meal === mealName)
    .map(itemTransform);
}
