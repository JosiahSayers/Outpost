import { getLogger } from "$/jobs/utils/logger-setup";
import {
  defaultWorkerOptions,
  redisConnection,
} from "$/jobs/workers/default-options";
import type { NotificationIconName } from "$/transformers/notification";
import { db } from "$/utils/db";
import { Queue, Worker, type Job } from "bullmq";
import type { NotificationUncheckedCreateInput } from "../../../../generated/prisma/models";

export const NOTIFICATIONS__CREATE_NOTIFICATION =
  "notifications__create_notification";

export const createNotificationQueue = new Queue<CreateNotificationJobData>(
  NOTIFICATIONS__CREATE_NOTIFICATION,
  {
    connection: redisConnection,
  },
);

// `icon` is narrowed from the generic `string | null` Prisma allows to the
// finite set of icons notification-icon.tsx actually renders -- anything
// else silently falls back to a bell, so a new producer job should pick
// from NotificationIconName (or add itself to it) rather than pass an
// arbitrary Phosphor name.
export interface CreateNotificationJobData extends Omit<
  NotificationUncheckedCreateInput,
  "icon"
> {
  icon?: NotificationIconName | null;
}

export async function createNotification(job: Job<CreateNotificationJobData>) {
  const logger = getLogger(job);
  try {
    await db.notification.create({ data: job.data });
  } catch (err) {
    logger.error("Failed to create notification", { error: err });
    throw err;
  }
}

export const createNotificationWorker = new Worker<CreateNotificationJobData>(
  NOTIFICATIONS__CREATE_NOTIFICATION,
  createNotification,
  defaultWorkerOptions,
);
