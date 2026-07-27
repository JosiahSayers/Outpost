import { faker } from "@faker-js/faker";
import type { MealPlanItemPackingStatus } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeMealPlanItemPackingStatus(
  overrides: OptionalPartial<MealPlanItemPackingStatus> = {},
): MealPlanItemPackingStatus {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    purchased: false,
    packed: false,
    mealPlanItemId: faker.string.uuid(),
    ...overrides,
  };
}
