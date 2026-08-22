import type { CreateNotificationJobData } from "$/jobs/workers/notifications/create-notification";
import {
  NOTIFICATIONS__SEND_PUSH_NOTIFICATION,
  sendPushNotification,
} from "$/jobs/workers/notifications/send-push-notification";
import { sendPushToDeviceQueue } from "$/jobs/workers/notifications/send-push-to-device";
import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { Job, JobType } from "bullmq";
import { beforeEach, describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

let userId: string;

const NOTIFICATION_NAME = "trip_status_update";
const JOB_STATES: JobType[] = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
];

// Seeded by
// prisma/seeds/production/account-settings/trip-status-update-web-push-setting.ts
// with a default of "true", so it's enabled unless a test overrides it.
beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

async function setPushSetting(forUserId: string, value: boolean) {
  const setting = await db.accountSetting.findUniqueOrThrow({
    where: { slug: Notifications.getSlug(NOTIFICATION_NAME, "web_push") },
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

function makeJob(data: CreateNotificationJobData) {
  return {
    id: "test-job-id",
    name: NOTIFICATIONS__SEND_PUSH_NOTIFICATION,
    data,
  } as unknown as Job<CreateNotificationJobData>;
}

describe("sendPushNotification", () => {
  it("fans out to one send-push-to-device job per subscription", async () => {
    await setPushSetting(userId, true);
    await db.pushSubscription.createMany({
      data: [
        {
          endpoint: "https://push.example.com/device-1",
          p256dh: "p256dh-1",
          auth: "auth-1",
          userId,
        },
        {
          endpoint: "https://push.example.com/device-2",
          p256dh: "p256dh-2",
          auth: "auth-2",
          userId,
        },
      ],
    });

    const job = makeJob({
      title: "Trip reminder",
      description: "Your trip starts tomorrow",
      referenceUrl: "/trips/abc",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    await sendPushNotification(job);

    const queued = await sendPushToDeviceQueue.getJobs(JOB_STATES);
    expect(queued).toHaveLength(2);
    expect(queued.map((j) => j.data.title)).toEqual([
      "Trip reminder",
      "Trip reminder",
    ]);
  });

  it("does not enqueue anything when the user has no subscriptions", async () => {
    await setPushSetting(userId, true);
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    await sendPushNotification(job);

    const queued = await sendPushToDeviceQueue.getJobs(JOB_STATES);
    expect(queued).toHaveLength(0);
  });

  it("does not enqueue when the user's web_push setting is disabled", async () => {
    await setPushSetting(userId, false);
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/disabled-setting",
        p256dh: "p256dh",
        auth: "auth",
        userId,
      },
    });

    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: NOTIFICATION_NAME,
    });

    const result = await sendPushNotification(job);

    expect(result).toBe("No push sent. User has this notification disabled.");
    const queued = await sendPushToDeviceQueue.getJobs(JOB_STATES);
    expect(queued).toHaveLength(0);
  });

  it("throws when the notification setting does not exist", async () => {
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: "does_not_exist",
    });

    await expect(sendPushNotification(job)).rejects.toThrow(
      "Notification does not exist",
    );
  });

  it("fans out without checking any setting when notificationSettingName is null", async () => {
    await db.pushSubscription.create({
      data: {
        endpoint: "https://push.example.com/no-setting",
        p256dh: "p256dh",
        auth: "auth",
        userId,
      },
    });

    const job = makeJob({
      title: "Admin announcement",
      userId,
      notificationSettingName: null,
    });

    await sendPushNotification(job);

    const queued = await sendPushToDeviceQueue.getJobs(JOB_STATES);
    expect(queued).toHaveLength(1);
  });
});
