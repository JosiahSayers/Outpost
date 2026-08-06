import { faker } from "@faker-js/faker";
import type { Feedback } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeFeedback(
  overrides: OptionalPartial<Feedback> = {},
): Feedback {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    text: faker.lorem.sentences(2),
    inferredTopic: [],
    inferredSubject: [],
    status: "new",
    submittedOnPage: faker.helpers.arrayElement([
      "/dashboard",
      "/trips",
      "/gear-inventory",
    ]),
    userId: faker.string.uuid(),
    duplicateId: null,
    ...overrides,
  };
}
