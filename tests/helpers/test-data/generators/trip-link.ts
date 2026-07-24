import { faker } from "@faker-js/faker";
import type { TripLink } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeTripLink(
  overrides: OptionalPartial<TripLink> = {},
): TripLink {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    url: faker.internet.url(),
    name: faker.lorem.words(3),
    description: faker.lorem.sentence(),
    imageUrl: faker.image.url(),
    type: "article",
    siteName: faker.company.name(),
    audioUrl: faker.internet.url(),
    videoUrl: faker.internet.url(),
    tripId: faker.string.uuid(),
    ...overrides,
  };
}
