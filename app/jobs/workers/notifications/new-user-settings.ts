import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultWorkerOptions } from "$/jobs/workers/default-options";
import { createNotificationQueue } from "$/jobs/workers/notifications/create-notification";
import { db } from "$/utils/db";
import { Worker, type Job } from "bullmq";

export const NOTIFICATIONS__NEW_USER_SETTINGS =
  "notifications__new_user_settings";

const BATCH_SIZE = 100;

const NOTIFICATION_TITLE = "Set your unit preferences";

export async function createNewUserSettingsNotifications(
  job: Job,
  now: Date = new Date(),
) {
  const logger = getLogger(job);
  const notifiedUserIds: string[] = [];

  try {
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    let cursor: string | undefined;

    while (true) {
      const newUsersWithoutSettings = await db.user.findMany({
        select: {
          id: true,
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        where: {
          createdAt: {
            gte: oneDayAgo,
            lt: now,
          },
          accountSettingValues: {
            none: {
              accountSetting: {
                slug: {
                  in: [
                    "liquid_viewing_unit",
                    "liquid_entry_unit",
                    "weight_viewing_unit",
                    "weight_entry_unit",
                  ],
                },
              },
            },
          },
          notifications: {
            none: {
              title: NOTIFICATION_TITLE,
            },
          },
        },
      });

      if (newUsersWithoutSettings.length === 0) {
        break;
      }

      await createNotificationQueue.addBulk(
        newUsersWithoutSettings.map(({ id }) => ({
          name: "new-user-settings-notification",
          data: {
            userId: id,
            title: NOTIFICATION_TITLE,
            description:
              "Click this notification to choose how Outpost displays weights and measures.",
            referenceUrl: "/account/preferences",
            icon: "RulerIcon",
          },
        })),
      );

      notifiedUserIds.push(...newUsersWithoutSettings.map(({ id }) => id));
      cursor = newUsersWithoutSettings.at(-1)!.id;

      if (newUsersWithoutSettings.length < BATCH_SIZE) {
        break;
      }
    }

    return { notifiedUserIds, notifiedCount: notifiedUserIds.length };
  } catch (err) {
    logger.error("Failed to create notification", { error: err });
    throw err;
  }
}

export const newUserSettingsNotificationsWorker = new Worker(
  NOTIFICATIONS__NEW_USER_SETTINGS,
  (job) => createNewUserSettingsNotifications(job),
  defaultWorkerOptions,
);
