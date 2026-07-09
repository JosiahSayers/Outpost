import { faker } from "@faker-js/faker";
import type { MealPlanDay } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeMealPlanDay(
  overrides: OptionalPartial<MealPlanDay> = {},
): MealPlanDay {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    dayNumber: 1,
    date: faker.date.soon(),
    tripId: faker.string.uuid(),
    ...overrides,
  };
}
