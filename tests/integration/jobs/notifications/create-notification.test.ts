import {
  NOTIFICATIONS__CREATE_NOTIFICATION,
  createNotification,
  type CreateNotificationJobData,
} from "$/jobs/workers/notifications/create-notification";
import { sendInAppNotificationQueue } from "$/jobs/workers/notifications/send-in-app-notification";
import { sendPushNotificationQueue } from "$/jobs/workers/notifications/send-push-notification";
import { db } from "$/utils/db";
import type { Job, JobType } from "bullmq";
import { beforeEach, describe, expect, it } from "bun:test";

let userId: string;

const JOB_STATES: JobType[] = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
];

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

function makeJob(
  data: CreateNotificationJobData,
  id = "test-job-id",
): Job<CreateNotificationJobData> {
  return {
    id,
    name: NOTIFICATIONS__CREATE_NOTIFICATION,
    data,
  } as unknown as Job<CreateNotificationJobData>;
}

describe("createNotification", () => {
  it("enqueues a send-in-app-notification job with the same data", async () => {
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: "trip_status_update",
    });

    await createNotification(job);

    const [queued] = await sendInAppNotificationQueue.getJobs(JOB_STATES);
    expect(queued?.data).toEqual(job.data);
  });

  it("enqueues a send-push-notification job with the same data", async () => {
    const job = makeJob({
      title: "Trip reminder",
      userId,
      notificationSettingName: "trip_status_update",
    });

    await createNotification(job);

    const [queued] = await sendPushNotificationQueue.getJobs(JOB_STATES);
    expect(queued?.data).toEqual(job.data);
  });

  it("does not double-enqueue on retry -- the second call is a no-op for jobs already added", async () => {
    const job = makeJob(
      {
        title: "Trip reminder",
        userId,
        notificationSettingName: "trip_status_update",
      },
      "retry-job-id",
    );

    await createNotification(job);
    await createNotification(job);

    const inAppJobs = await sendInAppNotificationQueue.getJobs(JOB_STATES);
    const pushJobs = await sendPushNotificationQueue.getJobs(JOB_STATES);
    expect(inAppJobs).toHaveLength(1);
    expect(pushJobs).toHaveLength(1);
  });
});
