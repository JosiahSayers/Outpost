import type {
  MealPlanItem,
  MealPlanItemPackingStatus,
} from "../../../generated/prisma/browser";

export type ClientMealPlanItemPackingStatus = Omit<
  MealPlanItemPackingStatus,
  "id" | "createdAt" | "updatedAt" | "mealPlanItemId"
>;

export type ClientMealPlanItem = Pick<
  MealPlanItem,
  | "id"
  | "name"
  | "calories"
  | "quantity"
  | "waterMl"
  | "dryWeightGrams"
  | "meal"
> & {
  status: ClientMealPlanItemPackingStatus;
};

type Input = MealPlanItem & {
  packingStatuses?: MealPlanItemPackingStatus[];
};

export function transform(item: Input): ClientMealPlanItem {
  return {
    id: item.id,
    name: item.name,
    calories: item.calories,
    quantity: item.quantity,
    waterMl: item.waterMl,
    dryWeightGrams: item.dryWeightGrams,
    meal: item.meal,
    status: {
      packed: item.packingStatuses?.[0]?.packed ?? false,
      purchased: item.packingStatuses?.[0]?.purchased ?? false,
    },
  };
}
