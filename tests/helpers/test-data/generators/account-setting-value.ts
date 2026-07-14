import { faker } from "@faker-js/faker";
import type { AccountSettingValue } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeAccountSettingValue(
  overrides: OptionalPartial<AccountSettingValue> = {},
): AccountSettingValue {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    value: faker.lorem.word(),
    accountSettingId: faker.string.uuid(),
    userId: faker.string.uuid(),
    ...overrides,
  };
}
