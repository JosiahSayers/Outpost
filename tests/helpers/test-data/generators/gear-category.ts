import { faker } from "@faker-js/faker";
import type { GearCategory } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeGearCategory(
  overrides: OptionalPartial<GearCategory> = {},
): GearCategory {
  return {
    id: faker.number.int(),
    name: faker.commerce.product(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    public: false,
    userId: null,
    ...overrides,
  };
}
