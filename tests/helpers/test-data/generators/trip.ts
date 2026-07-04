import { faker } from "@faker-js/faker";
import type { Trip } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeTrip(overrides: OptionalPartial<Trip> = {}): Trip {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    name: `${faker.animal.bear()} Wilderness Trip`,
    trail: `${faker.location.state()} Trail`,
    location: faker.location.state(),
    status: "planning",
    start: faker.date.soon(),
    end: faker.date.future(),
    userId: faker.string.uuid(),
    ...overrides,
  };
}
