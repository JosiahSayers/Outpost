import { faker } from "@faker-js/faker";
import type { PackingListSection } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makePackingListSection(
  overrides: OptionalPartial<PackingListSection> = {},
): PackingListSection {
  return {
    id: faker.string.uuid(),
    name: faker.animal.insect(),
    packingListId: faker.string.uuid(),
    sortPosition: faker.number.int(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ...overrides,
  };
}
