import { faker } from "@faker-js/faker";
import type { Notification } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeNotification(
  overrides: OptionalPartial<Notification> = {},
): Notification {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    title: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    icon: faker.lorem.word(),
    read: false,
    dismissed: false,
    userId: faker.string.uuid(),
    ...overrides,
  };
}
