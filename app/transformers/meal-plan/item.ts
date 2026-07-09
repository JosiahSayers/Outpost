import type { MealPlanMealItem } from "../../../generated/prisma/client";

export type ClientMealPlanMealItem = Pick<
  MealPlanMealItem,
  | "id"
  | "name"
  | "calories"
  | "quantity"
  | "waterMl"
  | "dryWeightGrams"
  | "meal"
>;

export function transform(item: MealPlanMealItem): ClientMealPlanMealItem {
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
