import { faker } from "@faker-js/faker";
import type { Session } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeSession(
  overrides: OptionalPartial<Session> = {},
): Session {
  return {
    id: faker.string.uuid(),
    expiresAt: faker.date.future(),
    token: faker.string.alphanumeric(32),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    userId: faker.string.uuid(),
    impersonatedBy: null,
    ...overrides,
  };
}
