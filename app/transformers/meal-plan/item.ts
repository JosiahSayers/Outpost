import type {
  MealPlanDayItem,
  MealPlanItem,
} from "../../../generated/prisma/browser";

export type ClientMealPlanItemStatus = Pick<
  MealPlanDayItem,
  "purchased" | "packed"
>;

export type ClientMealPlanItem = {
  id: string;
  mealPlanItemId: string;
  name: string;
  brand: string | null;
  calories: number;
  waterMl: number | null;
  dryWeightGrams: number | null;
  meal: MealPlanDayItem["meal"];
  quantity: number;
  status: ClientMealPlanItemStatus;
};

export type MealPlanDayItemInput = MealPlanDayItem & {
  mealPlanItem: MealPlanItem;
};

export function transform(dayItem: MealPlanDayItemInput): ClientMealPlanItem {
  return {
    id: dayItem.id,
    mealPlanItemId: dayItem.mealPlanItemId,
    name: dayItem.mealPlanItem.name,
    brand: dayItem.mealPlanItem.brand,
    calories: dayItem.mealPlanItem.calories,
    waterMl: dayItem.mealPlanItem.waterMl,
    dryWeightGrams: dayItem.mealPlanItem.dryWeightGrams,
    meal: dayItem.meal,
    quantity: dayItem.quantity,
    status: {
      purchased: dayItem.purchased,
      packed: dayItem.packed,
    },
  };
}
