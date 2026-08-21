import { faker } from "@faker-js/faker";
import type { GearCategory } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeGearCategory(
  overrides: OptionalPartial<GearCategory> = {},
): GearCategory {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.product(),
    keywords: [],
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    public: false,
    userId: null,
    ...overrides,
  };
}
