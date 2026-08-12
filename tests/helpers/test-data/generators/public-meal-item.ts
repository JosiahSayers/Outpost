import { faker } from "@faker-js/faker";
import type { PublicMealItem } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makePublicMealItem(
  overrides: OptionalPartial<PublicMealItem> = {},
): PublicMealItem {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    name: faker.commerce.productName(),
    brand: faker.company.name().slice(0, 25),
    calories: faker.number.int({ min: 100, max: 1000 }),
    waterMl: null,
    dryWeightGrams: null,
    imageId: null,
    sourceImageUrl: null,
    overrideImageUrl: null,
    sourceVendor: "peak_refuel",
    sourceProductId: faker.string.numeric(10),
    sourceUrl: faker.internet.url(),
    ...overrides,
  };
}
