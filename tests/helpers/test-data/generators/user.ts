import { faker } from "@faker-js/faker";
import type { User } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeUser(overrides: OptionalPartial<User> = {}): User {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    emailVerified: false,
    image: null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    role: null,
    banned: false,
    banReason: null,
    banExpires: null,
    ...overrides,
  };
}
