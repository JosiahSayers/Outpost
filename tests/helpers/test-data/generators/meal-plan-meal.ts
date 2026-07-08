import { faker } from "@faker-js/faker";
import type { MealPlanMeal } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeMealPlanMeal(
  overrides: OptionalPartial<MealPlanMeal> = {},
): MealPlanMeal {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    mealName: "breakfast",
    mealPlanDayId: faker.string.uuid(),
    ...overrides,
  };
}
