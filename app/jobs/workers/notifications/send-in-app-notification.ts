import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import type { CreateNotificationJobData } from "$/jobs/workers/notifications/create-notification";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { Job } from "bullmq";

export const NOTIFICATIONS__SEND_IN_APP_NOTIFICATION =
  "notifications__send_in_app_notification";

export async function sendInAppNotification(
  job: Job<CreateNotificationJobData>,
) {
  const logger = getLogger(job);
  try {
    const { notificationSettingName, ...notificationData } = job.data;
    // Some notifications (ex. admin only notifications) don't have an account setting to check
    if (notificationSettingName !== null) {
      const accountSetting = await db.accountSetting.findUnique({
        where: {
          slug: Notifications.getSlug(notificationSettingName, "in_app"),
        },
        include: {
          accountSettingValues: {
            where: { userId: notificationData.userId },
          },
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
        return "No notification sent. User has this notification disabled.";
      }
    }

    const notification = await db.notification.create({
      data: notificationData,
    });
    return { notificationId: notification.id };
  } catch (err) {
    logger.error("Failed to create notification", { error: err });
    throw err;
  }
}

const sendInAppNotificationJob = defineJob<CreateNotificationJobData>({
  name: NOTIFICATIONS__SEND_IN_APP_NOTIFICATION,
  processor: sendInAppNotification,
  defaultJobOptions,
});

export const {
  queue: sendInAppNotificationQueue,
  worker: sendInAppNotificationWorker,
} = sendInAppNotificationJob;

export default sendInAppNotificationJob;
