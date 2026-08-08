import { faker } from "@faker-js/faker";
import type { Image } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeImage(
  overrides: OptionalPartial<Image> = {},
): Image {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    r2Key: `public-meal-items/${faker.string.alphanumeric(10)}.webp`,
    contentType: "image/webp",
    width: 1000,
    height: 1000,
    ...overrides,
  };
}
