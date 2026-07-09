import type { MealPlanItem } from "../../../generated/prisma/client";

export type ClientMealPlanItem = Pick<
  MealPlanItem,
  | "id"
  | "name"
  | "calories"
  | "quantity"
  | "waterMl"
  | "dryWeightGrams"
  | "meal"
>;

export function transform(item: MealPlanItem): ClientMealPlanItem {
  return {
    id: item.id,
    name: item.name,
    calories: item.calories,
    quantity: item.quantity,
    waterMl: item.waterMl,
    dryWeightGrams: item.dryWeightGrams,
    meal: item.meal,
  };
}
