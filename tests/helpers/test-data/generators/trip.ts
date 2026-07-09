import { faker } from "@faker-js/faker";
import type { Trip } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeTrip(overrides: OptionalPartial<Trip> = {}): Trip {
  const start = overrides.start ?? faker.date.soon();
  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + 3);
  const end = overrides.end ?? endDate;

  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    name: `${faker.animal.bear()} Wilderness Trip`,
    trail: `${faker.location.state()} Trail`,
    location: faker.location.state(),
    status: "planning",
    start,
    end,
    userId: faker.string.uuid(),
    ...overrides,
  };
}
