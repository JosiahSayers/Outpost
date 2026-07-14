import { faker } from "@faker-js/faker";
import type { AccountSetting } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeAccountSetting(
  overrides: OptionalPartial<AccountSetting> = {},
): AccountSetting {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    slug: faker.lorem.slug(),
    name: faker.lorem.words(2),
    description: faker.lorem.sentence(),
    defaultValue: null,
    ...overrides,
  };
}
