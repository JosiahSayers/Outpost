import { faker } from "@faker-js/faker";
import type { PackingListItem } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makePackingListItem(
  overrides: OptionalPartial<PackingListItem> = {},
): PackingListItem {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    sortPosition: faker.number.int(),
    gearCategoryId: faker.string.uuid(),
    assignedGearId: faker.string.uuid(),
    packingListSectionId: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    quantity: faker.number.int(5),
    optional: false,
    trackGearAssignment: true,
    ...overrides,
  };
}
