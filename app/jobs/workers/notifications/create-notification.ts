import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { sendInAppNotificationQueue } from "$/jobs/workers/notifications/send-in-app-notification";
import { sendPushNotificationQueue } from "$/jobs/workers/notifications/send-push-notification";
import type { NotificationIconName } from "$/transformers/notification";
import type { Job } from "bullmq";
import type { NotificationUncheckedCreateInput } from "../../../../generated/prisma/models";

export const NOTIFICATIONS__CREATE_NOTIFICATION =
  "notifications__create_notification";

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
  notificationSettingName: string | null;
}

// A thin orchestrator: every existing trigger already enqueues onto this
// queue by name, so fanning out to per-channel jobs here is how a new
// channel (push) reaches every trigger for free, without editing any of
// them. Each channel job independently gates on its own account-setting
// suffix (_in_app / _web_push) and does its own delivery.
//
// The explicit jobIds matter for retry-safety: if this job is retried after
// partially succeeding (e.g. the in-app enqueue lands but push throws on a
// Redis blip), a deterministic id makes the re-add() a no-op for whichever
// child already exists instead of double-firing it.
export async function createNotification(job: Job<CreateNotificationJobData>) {
  const logger = getLogger(job);
  try {
    await Promise.all([
      sendInAppNotificationQueue.add("send-in-app-notification", job.data, {
        jobId: `${job.id}-in-app`,
      }),
      sendPushNotificationQueue.add("send-push-notification", job.data, {
        jobId: `${job.id}-push`,
      }),
    ]);
  } catch (err) {
    logger.error("Failed to enqueue notification delivery jobs", {
      error: err,
    });
    throw err;
  }
}

const createNotificationJob = defineJob<CreateNotificationJobData>({
  name: NOTIFICATIONS__CREATE_NOTIFICATION,
  processor: createNotification,
  defaultJobOptions,
});

export const {
  queue: createNotificationQueue,
  worker: createNotificationWorker,
} = createNotificationJob;

export default createNotificationJob;
