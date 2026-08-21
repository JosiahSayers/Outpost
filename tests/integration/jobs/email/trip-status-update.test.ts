import {
  EMAILS__TRIP_STATUS_UPDATE_WORKER,
  sendTripStatusUpdateEmail,
  type SendTripStatusUpdateEmailJobData,
} from "$/jobs/workers/email/trip-status-update";
import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { Job } from "bullmq";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Resend } from "resend";
import { make } from "../../../helpers/test-data/make";

let userId: string;
let userEmail: string;
const originalNodeEnv = Bun.env.NODE_ENV;

// Seeded by prisma/seeds/production/account-settings/notifications.ts with
// an email default of "false", so tests that need it enabled must opt in.
const NOTIFICATION_NAME = "trip_status_update";

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
  userEmail = user.email;
});

afterEach(() => {
  Bun.env.NODE_ENV = originalNodeEnv;
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

function makeJob(data: SendTripStatusUpdateEmailJobData) {
  return {
    id: "test-job-id",
    name: EMAILS__TRIP_STATUS_UPDATE_WORKER,
    data,
  } as unknown as Job<SendTripStatusUpdateEmailJobData>;
}

function makeResendClient(send: ReturnType<typeof mock>) {
  return { emails: { send } } as unknown as Resend;
}

function jobData(
  overrides: Partial<SendTripStatusUpdateEmailJobData> = {},
): SendTripStatusUpdateEmailJobData {
  return {
    userId,
    userEmail,
    userName: "Alex",
    title: "Your trip has started!",
    description: "We've automatically marked your trip as in progress.",
    tripName: "Pacific Crest Traverse",
    referenceUrl: "/trips/test-trip-id",
    ...overrides,
  };
}

describe("sendTripStatusUpdateEmail", () => {
  it("throws and does not send when the notification setting does not exist", async () => {
    const setting = await db.accountSetting.findUniqueOrThrow({
      where: { slug: Notifications.getSlug(NOTIFICATION_NAME, "email") },
    });
    await db.accountSetting.delete({ where: { id: setting.id } });
    const send = mock();

    await expect(
      sendTripStatusUpdateEmail(makeJob(jobData()), makeResendClient(send)),
    ).rejects.toThrow("Notification does not exist");
    expect(send).not.toHaveBeenCalled();
  });

  it("does not send when the user's email setting is disabled", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "email", false);
    const send = mock();

    const result = await sendTripStatusUpdateEmail(
      makeJob(jobData()),
      makeResendClient(send),
    );

    expect(result).toBe("No email sent. User has this notification disabled.");
    expect(send).not.toHaveBeenCalled();
  });

  it("only checks the email setting, ignoring the in-app setting", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "email", true);
    await setNotificationSetting(userId, NOTIFICATION_NAME, "in_app", false);
    Bun.env.NODE_ENV = "production";
    const send = mock(async () => ({
      data: { id: "resend-email-id" },
      error: null,
    }));

    await sendTripStatusUpdateEmail(makeJob(jobData()), makeResendClient(send));

    expect(send).toHaveBeenCalledTimes(1);
  });

  it("skips sending and returns a placeholder id outside of production", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "email", true);
    expect(Bun.env.NODE_ENV).not.toBe("production");
    const send = mock();

    const result = await sendTripStatusUpdateEmail(
      makeJob(jobData()),
      makeResendClient(send),
    );

    expect(result).toEqual({
      resendEmailId: "JOB_SKIPPED_IN_LOWER_ENVIRONMENT",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends via the resend client and returns its email id in production", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "email", true);
    Bun.env.NODE_ENV = "production";
    const send = mock(
      async (_payload: Parameters<Resend["emails"]["send"]>[0]) => ({
        data: { id: "resend-email-id" },
        error: null,
      }),
    );

    const result = await sendTripStatusUpdateEmail(
      makeJob(jobData()),
      makeResendClient(send),
    );

    expect(result).toEqual({ resendEmailId: "resend-email-id" });
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0]?.[0];
    expect(payload?.to).toBe(userEmail);
    expect(payload?.subject).toBe("Outpost Trip Update");
  });

  it("creates a communication audit log and updates it with the resend email id in production", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "email", true);
    Bun.env.NODE_ENV = "production";
    const send = mock(
      async (_payload: Parameters<Resend["emails"]["send"]>[0]) => ({
        data: { id: "resend-email-id" },
        error: null,
      }),
    );

    await sendTripStatusUpdateEmail(makeJob(jobData()), makeResendClient(send));

    const auditLog = await db.communicationAuditLog.findFirstOrThrow({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLog).toMatchObject({
      communicationType: "email",
      to: userEmail,
      subject: "Outpost Trip Update",
      thirdPartyId: "resend-email-id",
      userId,
    });
  });

  it("throws and deletes the communication audit log when the resend client returns an error in production", async () => {
    await setNotificationSetting(userId, NOTIFICATION_NAME, "email", true);
    Bun.env.NODE_ENV = "production";
    const resendError = {
      name: "application_error",
      message: "Something went wrong",
      statusCode: 500,
    };
    const send = mock(async () => ({ data: null, error: resendError }));

    await expect(
      sendTripStatusUpdateEmail(makeJob(jobData()), makeResendClient(send)),
    ).rejects.toEqual(resendError);

    const auditLog = await db.communicationAuditLog.findFirst({
      where: { userId },
    });
    expect(auditLog).toBeNull();
  });
});
