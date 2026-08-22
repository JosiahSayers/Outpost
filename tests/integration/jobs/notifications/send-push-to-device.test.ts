import {
  NOTIFICATIONS__SEND_PUSH_TO_DEVICE,
  sendPushToDevice,
  type SendPushToDeviceJobData,
} from "$/jobs/workers/notifications/send-push-to-device";
import { db } from "$/utils/db";
import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { WebPushError, type PushSubscription } from "web-push";

let userId: string;
let subscriptionId: string;
let endpoint: string;

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
  endpoint = `https://push.example.com/${crypto.randomUUID()}`;
  const subscription = await db.pushSubscription.create({
    data: { endpoint, p256dh: "p256dh-key", auth: "auth-key", userId },
  });
  subscriptionId = subscription.id;
});

function makeJob(data: Partial<SendPushToDeviceJobData> = {}) {
  return {
    id: "test-job-id",
    name: NOTIFICATIONS__SEND_PUSH_TO_DEVICE,
    data: {
      subscriptionId,
      title: "Trip reminder",
      body: "Your trip starts tomorrow",
      referenceUrl: "/trips/abc",
      ...data,
    },
  } as unknown as Job<SendPushToDeviceJobData>;
}

function makeWebPushError(statusCode: number) {
  return new WebPushError("push failed", statusCode, {}, "", endpoint);
}

describe("sendPushToDevice", () => {
  it("sends via the injected client and logs a CommunicationAuditLog row", async () => {
    const sendNotification = mock(
      async (
        _subscription: PushSubscription,
        _payload?: string | Buffer | null,
      ) => ({}) as any,
    );

    await sendPushToDevice(makeJob(), { sendNotification });

    expect(sendNotification).toHaveBeenCalledTimes(1);
    const [subscriptionArg] = sendNotification.mock.calls[0]!;
    expect(subscriptionArg).toEqual({
      endpoint,
      keys: { p256dh: "p256dh-key", auth: "auth-key" },
    });

    const log = await db.communicationAuditLog.findFirstOrThrow({
      where: { userId, communicationType: "push" },
    });
    expect(log.to).toBe(endpoint);
    expect(log.subject).toBe("Trip reminder");
  });

  it("is a no-op when the subscription no longer exists", async () => {
    const sendNotification = mock(async () => ({}) as any);
    await db.pushSubscription.delete({ where: { id: subscriptionId } });

    const result = await sendPushToDevice(makeJob(), { sendNotification });

    expect(result).toBe("No-op: subscription no longer exists.");
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("prunes the subscription and keeps the audit log on a 410 response", async () => {
    const sendNotification = mock(async () => {
      throw makeWebPushError(410);
    });

    const result = await sendPushToDevice(makeJob(), { sendNotification });

    expect(result).toBe("Subscription gone -- pruned.");
    expect(
      await db.pushSubscription.findUnique({ where: { id: subscriptionId } }),
    ).toBeNull();
    expect(
      await db.communicationAuditLog.findFirst({
        where: { userId, communicationType: "push" },
      }),
    ).not.toBeNull();
  });

  it("prunes the subscription on a 404 response", async () => {
    const sendNotification = mock(async () => {
      throw makeWebPushError(404);
    });

    await sendPushToDevice(makeJob(), { sendNotification });

    expect(
      await db.pushSubscription.findUnique({ where: { id: subscriptionId } }),
    ).toBeNull();
  });

  it("keeps the subscription, deletes the audit log, and rethrows on a non-terminal failure", async () => {
    const sendNotification = mock(async () => {
      throw makeWebPushError(500);
    });

    await expect(
      sendPushToDevice(makeJob(), { sendNotification }),
    ).rejects.toThrow();

    expect(
      await db.pushSubscription.findUnique({ where: { id: subscriptionId } }),
    ).not.toBeNull();
    expect(
      await db.communicationAuditLog.findFirst({
        where: { userId, communicationType: "push" },
      }),
    ).toBeNull();
  });
});
