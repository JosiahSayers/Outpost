import { faker } from "@faker-js/faker";
import type { File } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeFile(overrides: OptionalPartial<File> = {}): File {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    r2Key: faker.string.uuid(),
    contentType: "application/pdf",
    filename: `${faker.system.fileName()}.pdf`,
    bytes: faker.number.int({ min: 1024, max: 1e7 }),
    tripId: faker.string.uuid(),
    ...overrides,
  };
}
