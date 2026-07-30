import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultWorkerOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import { Worker, type Job } from "bullmq";
import type { NotificationCreateInput } from "../../../../generated/prisma/models";

export const NOTIFICATIONS__CREATE_NOTIFICATION =
  "notifications__create_notification";

interface JobData extends NotificationCreateInput {}

export async function createNotification(job: Job<JobData>) {
  const logger = getLogger(job);
  try {
    await db.notification.create({ data: job.data });
  } catch (err) {
    logger.error("Failed to create notification", { error: err });
    throw err;
  }
}

export const createNotificationWorker = new Worker<JobData>(
  NOTIFICATIONS__CREATE_NOTIFICATION,
  createNotification,
  defaultWorkerOptions,
);
