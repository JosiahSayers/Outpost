import { faker } from "@faker-js/faker";
import type { TripTask } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeTripTask(
  overrides: OptionalPartial<TripTask> = {},
): TripTask {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    name: faker.lorem.words(3),
    complete: false,
    phase: "before",
    dueDate: faker.date.soon(),
    tripId: faker.string.uuid(),
    ...overrides,
  };
}
