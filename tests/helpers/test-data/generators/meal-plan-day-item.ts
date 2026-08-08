import { faker } from "@faker-js/faker";
import type { MealPlanDayItem } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeMealPlanDayItem(
  overrides: OptionalPartial<MealPlanDayItem> = {},
): MealPlanDayItem {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    meal: "breakfast",
    quantity: 1,
    purchased: false,
    packed: false,
    mealPlanDayId: faker.string.uuid(),
    mealPlanItemId: faker.string.uuid(),
    ...overrides,
  };
}
