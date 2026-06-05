import { faker } from "@faker-js/faker";
import type { PackingListSection } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makePackingListSection(
  overrides: OptionalPartial<PackingListSection> = {},
) {
  return {
    id: faker.number.int(),
    name: faker.animal.insect(),
    packingListId: faker.number.int(),
    sortPosition: faker.number.int(),
    ...overrides,
  };
}
