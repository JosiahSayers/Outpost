import { faker } from "@faker-js/faker";
import type { GearInventoryItem } from "../../../../generated/prisma/client";

export default function makeGearInventoryItem(
  overrides: Partial<GearInventoryItem> = {},
): GearInventoryItem {
  return {
    id: faker.number.int(),
    name: faker.commerce.productName(),
    quantity: faker.number.int({ min: 1, max: 5 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    gearCategoryId: faker.number.int(),
    userId: faker.string.uuid(),
    ...overrides,
  };
}
