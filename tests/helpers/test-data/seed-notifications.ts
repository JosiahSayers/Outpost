import type { Notification } from "../../../generated/prisma/client";
import { db } from "$/utils/db";
import type { OptionalPartial } from "../../../type-helpers";
import { make } from "./make";

// Notifications are only ever produced by a background job (see
// app/jobs/workers/notifications/create-notification.ts) — there is no POST
// endpoint — so e2e tests that need one to exist create it straight through
// the DB, the same way the job itself would.
export async function seedNotification(
  userId: string,
  overrides: OptionalPartial<Omit<Notification, "userId">> = {},
): Promise<Notification> {
  return db.notification.create({
    data: make("Notification", { userId, ...overrides }),
  });
}
