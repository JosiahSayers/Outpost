import { faker } from "@faker-js/faker";
import type { FeedbackAuditLog } from "../../../../generated/prisma/client";
import type { OptionalPartial } from "../../../../type-helpers";

export default function makeFeedbackAuditLog(
  overrides: OptionalPartial<FeedbackAuditLog> = {},
): FeedbackAuditLog {
  return {
    id: faker.string.uuid(),
    createdAt: faker.date.past(),
    updatedAt: faker.date.past(),
    changeDescription: "Status change: new -> triaged",
    feedbackId: faker.string.uuid(),
    adminId: faker.string.uuid(),
    ...overrides,
  };
}
