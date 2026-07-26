import { faker } from "@faker-js/faker";
import type { TripPackingList } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeTripPackingList(
  overrides: OptionalPartial<TripPackingList> = {},
): TripPackingList {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    tripId: faker.string.uuid(),
    packingListId: faker.string.uuid(),
    ...overrides,
  };
}
