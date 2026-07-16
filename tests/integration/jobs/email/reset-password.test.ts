import {
  EMAILS__RESET_PASSWORD_WORKER,
  sendResetPasswordEmail,
  type SendResetPasswordEmailData,
} from "$/jobs/workers/email/reset-password";
import { db } from "$/utils/db";
import type { Job } from "bullmq";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Resend } from "resend";

let user: SendResetPasswordEmailData["user"];
const originalNodeEnv = Bun.env.NODE_ENV;

beforeEach(async () => {
  user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
});

afterEach(() => {
  Bun.env.NODE_ENV = originalNodeEnv;
});

function makeJob(data: SendResetPasswordEmailData) {
  return {
    id: "test-job-id",
    name: EMAILS__RESET_PASSWORD_WORKER,
    data,
  } as unknown as Job<SendResetPasswordEmailData>;
}

function makeResendClient(send: ReturnType<typeof mock>) {
  return { emails: { send } } as unknown as Resend;
}

describe("sendResetPasswordEmail", () => {
  it("skips sending and returns a placeholder id outside of production", async () => {
    expect(Bun.env.NODE_ENV).not.toBe("production");

    const send = mock();
    const job = makeJob({
      user,
      url: "https://outpost.sayerscloud.com/reset-password?token=abc123",
    });

    const result = await sendResetPasswordEmail(job, makeResendClient(send));

    expect(result).toEqual({
      resendEmailId: "JOB_SKIPPED_IN_LOWER_ENVIRONMENT",
    });
    expect(send).not.toHaveBeenCalled();
  });

  it("sends via the resend client and returns its email id in production", async () => {
    Bun.env.NODE_ENV = "production";
    const send = mock(
      async (_payload: Parameters<Resend["emails"]["send"]>[0]) => ({
        data: { id: "resend-email-id" },
        error: null,
      }),
    );
    const job = makeJob({
      user,
      url: "https://outpost.sayerscloud.com/reset-password?token=abc123",
    });

    const result = await sendResetPasswordEmail(job, makeResendClient(send));

    expect(result).toEqual({ resendEmailId: "resend-email-id" });
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0]?.[0];
    expect(payload?.to).toBe(user.email);
    expect(payload?.subject).toBe("Outpost Password Reset");
  });

  it("creates a communication audit log and updates it with the resend email id in production", async () => {
    Bun.env.NODE_ENV = "production";
    const send = mock(
      async (_payload: Parameters<Resend["emails"]["send"]>[0]) => ({
        data: { id: "resend-email-id" },
        error: null,
      }),
    );
    const job = makeJob({
      user,
      url: "https://outpost.sayerscloud.com/reset-password?token=abc123",
    });

    await sendResetPasswordEmail(job, makeResendClient(send));

    const auditLog = await db.communicationAuditLog.findFirstOrThrow({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLog).toMatchObject({
      communicationType: "email",
      to: user.email,
      subject: "Outpost Password Reset",
      thirdPartyId: "resend-email-id",
      userId: user.id,
    });
  });

  it("throws when the resend client returns an error in production", async () => {
    Bun.env.NODE_ENV = "production";
    const resendError = {
      name: "application_error",
      message: "Something went wrong",
      statusCode: 500,
    };
    const send = mock(async () => ({ data: null, error: resendError }));
    const job = makeJob({
      user,
      url: "https://outpost.sayerscloud.com/reset-password?token=abc123",
    });

    await expect(
      sendResetPasswordEmail(job, makeResendClient(send)),
    ).rejects.toEqual(resendError);
  });

  it("deletes the communication audit log when the email fails to send", async () => {
    Bun.env.NODE_ENV = "production";
    const resendError = {
      name: "application_error",
      message: "Something went wrong",
      statusCode: 500,
    };
    const send = mock(async () => ({ data: null, error: resendError }));
    const job = makeJob({
      user,
      url: "https://outpost.sayerscloud.com/reset-password?token=abc123",
    });

    await expect(
      sendResetPasswordEmail(job, makeResendClient(send)),
    ).rejects.toEqual(resendError);

    const auditLog = await db.communicationAuditLog.findFirst({
      where: { userId: user.id },
    });
    expect(auditLog).toBeNull();
  });
});
