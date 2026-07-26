import { faker } from "@faker-js/faker";
import type { TripPackingListItemStatus } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeTripPackingListItemStatus(
  overrides: OptionalPartial<TripPackingListItemStatus> = {},
): TripPackingListItemStatus {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    packed: false,
    notNeeded: false,
    tripPackingListId: faker.string.uuid(),
    packingListItemId: faker.string.uuid(),
    ...overrides,
  };
}
