import { faker } from "@faker-js/faker";
import type { PackingList } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makePackingList(
  overrides: OptionalPartial<PackingList> = {},
): PackingList {
  return {
    id: faker.string.uuid(),
    name: `${faker.internet.displayName()}'s Packing List`,
    public: true,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    sourceUrl: faker.internet.url(),
    description: faker.lorem.paragraph(),
    copiedFromPackingListId: null,
    userId: null,
    ...overrides,
  };
}
