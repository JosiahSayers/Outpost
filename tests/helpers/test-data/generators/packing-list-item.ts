import { faker } from "@faker-js/faker";
import type { PackingListItem } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makePackingListItem(
  overrides: OptionalPartial<PackingListItem> = {},
) {
  return {
    id: faker.number.int(),
    name: faker.commerce.productName(),
    sortPosition: faker.number.int(),
    gearCategoryId: faker.number.int(),
    gearInventoryItemId: faker.number.int(),
    packingListSectionId: faker.number.int(),
    ...overrides,
  };
}
