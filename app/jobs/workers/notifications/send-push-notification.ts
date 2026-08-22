import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import type { CreateNotificationJobData } from "$/jobs/workers/notifications/create-notification";
import { sendPushToDeviceQueue } from "$/jobs/workers/notifications/send-push-to-device";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { Job } from "bullmq";

export const NOTIFICATIONS__SEND_PUSH_NOTIFICATION =
  "notifications__send_push_notification";

// Gates on the _web_push account setting for this notification type, then
// fans out to one job per subscribed device -- see send-push-to-device.ts
// for why that's a separate job rather than looping and sending here.
export async function sendPushNotification(
  job: Job<CreateNotificationJobData>,
) {
  const logger = getLogger(job);
  try {
    const {
      notificationSettingName,
      userId,
      title,
      description,
      referenceUrl,
    } = job.data;

    if (notificationSettingName !== null) {
      const accountSetting = await db.accountSetting.findUnique({
        where: {
          slug: Notifications.getSlug(notificationSettingName, "web_push"),
        },
        include: {
          accountSettingValues: { where: { userId } },
        },
      });

      if (!accountSetting) {
        logger.error("tried to check unknown notification setting", {
          notificationSettingName,
        });
        throw new Error("Notification does not exist");
      }

      const setting = transformers.userAccountSetting(accountSetting);
      if (setting.value !== "true") {
        return "No push sent. User has this notification disabled.";
      }
    }

    const subscriptions = await db.pushSubscription.findMany({
      where: { userId },
    });

    await sendPushToDeviceQueue.addBulk(
      subscriptions.map((subscription) => ({
        name: "send-push-to-device",
        data: {
          subscriptionId: subscription.id,
          title,
          body: description ?? null,
          referenceUrl: referenceUrl ?? null,
        },
        opts: { jobId: `${job.id}-${subscription.id}` },
      })),
    );

    return { devicesQueued: subscriptions.length };
  } catch (err) {
    logger.error("Failed to enqueue push notification", { error: err });
    throw err;
  }
}

const sendPushNotificationJob = defineJob<CreateNotificationJobData>({
  name: NOTIFICATIONS__SEND_PUSH_NOTIFICATION,
  processor: sendPushNotification,
  defaultJobOptions,
});

export const {
  queue: sendPushNotificationQueue,
  worker: sendPushNotificationWorker,
} = sendPushNotificationJob;

export default sendPushNotificationJob;
