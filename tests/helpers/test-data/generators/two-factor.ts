import { faker } from "@faker-js/faker";
import type { TwoFactor } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeTwoFactor(
  overrides: OptionalPartial<TwoFactor> = {},
): TwoFactor {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    secret: faker.string.alphanumeric(32),
    backupCodes: faker.string.alphanumeric(64),
    verified: true,
    failedVerificationCount: 0,
    lockedUntil: null,
    createdAt: faker.date.past(),
    ...overrides,
  };
}
