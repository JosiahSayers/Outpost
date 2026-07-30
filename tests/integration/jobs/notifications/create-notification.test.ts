import {
  NOTIFICATIONS__CREATE_NOTIFICATION,
  createNotification,
} from "$/jobs/workers/notifications/create-notification";
import { db } from "$/utils/db";
import type { Job } from "bullmq";
import { beforeEach, describe, expect, it } from "bun:test";
import type { NotificationUncheckedCreateInput } from "../../../../generated/prisma/models";

let userId: string;

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

function makeJob(data: NotificationUncheckedCreateInput) {
  return {
    id: "test-job-id",
    name: NOTIFICATIONS__CREATE_NOTIFICATION,
    data,
  } as unknown as Job<NotificationUncheckedCreateInput>;
}

describe("createNotification", () => {
  it("creates a notification with the given fields", async () => {
    const job = makeJob({
      title: "Trip reminder",
      description: "Your trip starts tomorrow",
      icon: "calendar",
      userId,
    });

    await createNotification(job);

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
    });

    await createNotification(job);

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
    });

    await createNotification(job);

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
    });

    const before = await db.notification.count();

    await expect(createNotification(job)).rejects.toThrow();

    const count = await db.notification.count();
    expect(count).toBe(before);
  });
});
