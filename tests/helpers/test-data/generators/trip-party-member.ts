import { faker } from "@faker-js/faker";
import type { TripPartyMember } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeTripPartyMember(
  overrides: OptionalPartial<TripPartyMember> = {},
): TripPartyMember {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    name: faker.person.fullName(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    userId: null,
    tripId: faker.string.uuid(),
    ...overrides,
  };
}
