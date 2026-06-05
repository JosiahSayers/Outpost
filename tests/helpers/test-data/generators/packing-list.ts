import { faker } from "@faker-js/faker";
import type { PackingList } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makePackingList(
  overrides: OptionalPartial<PackingList> = {},
) {
  return {
    id: faker.number.int(),
    name: `${faker.internet.displayName()}'s Packing List`,
    public: true,
    ...overrides,
  };
}
