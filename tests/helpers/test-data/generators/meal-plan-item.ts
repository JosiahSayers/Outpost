import { faker } from "@faker-js/faker";
import type { MealPlanItem } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeMealPlanItem(
  overrides: OptionalPartial<MealPlanItem> = {},
): MealPlanItem {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    name: faker.commerce.productName(),
    calories: faker.number.int({ min: 100, max: 1000 }),
    meal: "breakfast",
    quantity: 1,
    waterMl: null,
    dryWeightGrams: null,
    mealPlanDayId: faker.string.uuid(),
    ...overrides,
  };
}
