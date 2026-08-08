import type { MealPlanItem } from "../../../generated/prisma/browser";

export type ClientMealPlanItemSummary = Pick<
  MealPlanItem,
  "id" | "name" | "brand" | "calories" | "waterMl" | "dryWeightGrams"
>;

export function transform(item: MealPlanItem): ClientMealPlanItemSummary {
  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    calories: item.calories,
    waterMl: item.waterMl,
    dryWeightGrams: item.dryWeightGrams,
  };
}
