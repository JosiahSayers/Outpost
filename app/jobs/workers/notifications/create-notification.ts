import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { transformers } from "$/transformers";
import type { NotificationIconName } from "$/transformers/notification";
import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
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

export async function createNotification(job: Job<CreateNotificationJobData>) {
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
