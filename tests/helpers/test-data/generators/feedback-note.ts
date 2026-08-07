import { faker } from "@faker-js/faker";
import type { FeedbackNote } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeFeedbackNote(
  overrides: OptionalPartial<FeedbackNote> = {},
): FeedbackNote {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    message: faker.lorem.sentence(),
    userFacing: false,
    feedbackId: faker.string.uuid(),
    adminId: faker.string.uuid(),
    ...overrides,
  };
}
