import { toDateOnly } from "$/transformers/helpers";
import type {
  MealName,
  MealPlanDay,
  MealPlanMealItem,
} from "../../../generated/prisma/browser";
import {
  transform as itemTransform,
  type ClientMealPlanMealItem,
} from "./item";

const MEAL_NAMES: MealName[] = ["breakfast", "lunch", "dinner", "snacks"];

export type ClientMealPlanDay = Pick<MealPlanDay, "id" | "dayNumber"> & {
  date: string | null;
  meals: Record<MealName, ClientMealPlanMealItem[]>;
};

export type FullMealPlanDayInput = MealPlanDay & {
  mealItems: MealPlanMealItem[];
};

export function transform(item: FullMealPlanDayInput): ClientMealPlanDay {
  return {
    id: item.id,
    date: toDateOnly(item.date),
    dayNumber: item.dayNumber,
    meals: Object.fromEntries(
      MEAL_NAMES.map((mealName) => [
        mealName,
        getItems(item.mealItems, mealName),
      ]),
    ) as Record<MealName, ClientMealPlanMealItem[]>,
  };
}

function getItems(mealItems: MealPlanMealItem[], mealName: MealName) {
  return mealItems
    .filter((mealItem) => mealItem.meal === mealName)
    .map(itemTransform);
}
