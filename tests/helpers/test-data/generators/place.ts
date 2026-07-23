import { faker } from "@faker-js/faker";
import type { Place } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makePlace(
  overrides: OptionalPartial<Place> = {},
): Place {
  return {
    id: faker.string.uuid(),
    name: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    publicAccess: "Open",
    backpackingTier: 3,
    acres: faker.number.float({ min: 1, max: 100000 }),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    ...overrides,
  };
}
