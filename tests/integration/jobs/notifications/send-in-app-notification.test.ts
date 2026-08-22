import type { CreateNotificationJobData } from "$/jobs/workers/notifications/create-notification";
import {
  NOTIFICATIONS__SEND_IN_APP_NOTIFICATION,
  sendInAppNotification,
} from "$/jobs/workers/notifications/send-in-app-notification";
import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { Job } from "bullmq";
import { beforeEach, describe, expect, it } from "bun:test";
import type { NotificationUncheckedCreateInput } from "../../../../generated/prisma/models";
import { make } from "../../../helpers/test-data/make";

let userId: string;

// Seeded by prisma/seeds/production/account-settings/notifications.ts with
// an in-app default of "true", so it's enabled unless a test overrides it.
const NOTIFICATION_NAME = "trip_status_update";

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

async function setNotificationSetting(
  forUserId: string,
  notification: string,
  type: "in_app" | "email",
  value: boolean,
) {
  const setting = await db.accountSetting.findUniqueOrThrow({
    where: { slug: Notifications.getSlug(notification, type) },
  });
  await db.accountSettingValue.upsert({
    where: {
      accountSettingId_userId: {
        accountSettingId: setting.id,
        userId: forUserId,
      },
    },
    create: make("AccountSettingValue", {
      accountSettingId: setting.id,
      userId: forUserId,
      value: value ? "true" : "false",
    }),
    update: { value: value ? "true" : "false" },
  });
}

// sendInAppNotification writes whatever it's given straight to the DB -- it
// doesn't validate `icon` against NotificationIconName, only the frontend
// map does. Typed as the broader Prisma input (not CreateNotificationJobData)
// so tests below can exercise that pass-through with an arbitrary icon
// string, then cast at the job boundary the same way a real malformed job
// payload would arrive.
function makeJob(
  data: NotificationUncheckedCreateInput & {
    notificationSettingName: string | null;
  },
) {
  return {
    id: "test-job-id",
    name: NOTIFICATIONS__SEND_IN_APP_NOTIFICATION,
    data,
  } as unknown as Job<CreateNotificationJobData>;
}

describe("sendInAppNotification", () => {
  it("creates a notification with the given fields", async () => {
    const job = makeJob({
      title: "Trip reminder",
      description: "Your trip starts tomorrow",
      icon: "calendar",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    await sendInAppNotification(job);

    const notification = await db.notification.findFirstOrThrow({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    expect(notification).toMatchObject({
      title: "Trip reminder",
      description: "Your trip starts tomorrow",
      icon: "calendar",
      userId,
    });
  });

  it("defaults read and dismissed to false when not provided", async () => {
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    await sendInAppNotification(job);

    const notification = await db.notification.findFirstOrThrow({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    expect(notification.read).toBe(false);
    expect(notification.dismissed).toBe(false);
  });

  it("respects explicit read and dismissed values", async () => {
    const job = makeJob({
      title: "Trip reminder",
      read: true,
      dismissed: true,
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    await sendInAppNotification(job);

    const notification = await db.notification.findFirstOrThrow({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    expect(notification.read).toBe(true);
    expect(notification.dismissed).toBe(true);
  });

  it("throws and does not create a row when the referenced user does not exist", async () => {
    const job = makeJob({
      title: "Trip reminder",
      userId: "does-not-exist",
      notificationSettingName: NOTIFICATION_NAME,
    });

    const before = await db.notification.count();

    await expect(sendInAppNotification(job)).rejects.toThrow();

    const count = await db.notification.count();
    expect(count).toBe(before);
  });

  it("throws and does not create a row when the notification setting does not exist", async () => {
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: "does_not_exist",
    });

    const before = await db.notification.count();

    await expect(sendInAppNotification(job)).rejects.toThrow(
      "Notification does not exist",
    );

    const count = await db.notification.count();
    expect(count).toBe(before);
  });

  it("creates the notification when the user's in-app setting is enabled", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "in_app", true);
    const before = await db.notification.count({ where: { userId } });
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    await sendInAppNotification(job);

    const count = await db.notification.count({ where: { userId } });
    expect(count).toBe(before + 1);
  });

  it("does not create a notification when the user's in-app setting is disabled", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "in_app", false);
    const before = await db.notification.count({ where: { userId } });
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    await sendInAppNotification(job);

    const count = await db.notification.count({ where: { userId } });
    expect(count).toBe(before);
  });

  it("returns a message and does not throw when the notification is disabled", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "in_app", false);
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    const result = await sendInAppNotification(job);

    expect(result).toBe(
      "No notification sent. User has this notification disabled.",
    );
  });

  it("only checks the in-app setting, ignoring the email setting", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "email", false);
    const before = await db.notification.count({ where: { userId } });
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    await sendInAppNotification(job);

    const count = await db.notification.count({ where: { userId } });
    expect(count).toBe(before + 1);
  });

  it("does not affect other users' notification settings", async () => {
    const otherUser = await db.user.findUniqueOrThrow({
      where: { email: "user2@test.com" },
    });
    await setNotificationSetting(
      otherUser.id,
      NOTIFICATION_NAME,
      "in_app",
      false,
    );
    const before = await db.notification.count({ where: { userId } });
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    await sendInAppNotification(job);

    const count = await db.notification.count({ where: { userId } });
    expect(count).toBe(before + 1);
  });

  it("creates the notification without checking any setting when notificationSettingName is null", async () => {
    const before = await db.notification.count({ where: { userId } });
    const job = makeJob({
      title: "Admin announcement",
      userId,
      notificationSettingName: null,
    });

    const result = await sendInAppNotification(job);

    expect(result).not.toBe(
      "No notification sent. User has this notification disabled.",
    );
    const count = await db.notification.count({ where: { userId } });
    expect(count).toBe(before + 1);
  });
});
