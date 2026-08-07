import {
  EMAILS__PASSWORD_CHANGED_WORKER,
  sendPasswordChangedEmail,
  type SendPasswordChangedEmailData,
} from "$/jobs/workers/email/password-changed";
import { db } from "$/utils/db";
import type { Job } from "bullmq";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Resend } from "resend";

let user: SendPasswordChangedEmailData["user"];
const originalNodeEnv = Bun.env.NODE_ENV;

beforeEach(async () => {
  user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
});

afterEach(() => {
  Bun.env.NODE_ENV = originalNodeEnv;
});

function makeJob(data: SendPasswordChangedEmailData) {
  return {
    id: "test-job-id",
    name: EMAILS__PASSWORD_CHANGED_WORKER,
    data,
  } as unknown as Job<SendPasswordChangedEmailData>;
}

function makeResendClient(send: ReturnType<typeof mock>) {
  return { emails: { send } } as unknown as Resend;
}

describe("sendPasswordChangedEmail", () => {
  it("skips sending and returns a placeholder id outside of production", async () => {
    expect(Bun.env.NODE_ENV).not.toBe("production");

    const send = mock();
    const job = makeJob({ user });

    const result = await sendPasswordChangedEmail(job, makeResendClient(send));

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
    const job = makeJob({ user });

    const result = await sendPasswordChangedEmail(job, makeResendClient(send));

    expect(result).toEqual({ resendEmailId: "resend-email-id" });
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0]?.[0];
    expect(payload?.to).toBe(user.email);
    expect(payload?.subject).toBe("Outpost Password Changed");
  });

  it("creates a communication audit log and updates it with the resend email id in production", async () => {
    Bun.env.NODE_ENV = "production";
    const send = mock(
      async (_payload: Parameters<Resend["emails"]["send"]>[0]) => ({
        data: { id: "resend-email-id" },
        error: null,
      }),
    );
    const job = makeJob({ user });

    await sendPasswordChangedEmail(job, makeResendClient(send));

    const auditLog = await db.communicationAuditLog.findFirstOrThrow({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    expect(auditLog).toMatchObject({
      communicationType: "email",
      to: user.email,
      subject: "Outpost Password Changed",
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
    const job = makeJob({ user });

    await expect(
      sendPasswordChangedEmail(job, makeResendClient(send)),
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
    const job = makeJob({ user });

    await expect(
      sendPasswordChangedEmail(job, makeResendClient(send)),
    ).rejects.toEqual(resendError);

    const auditLog = await db.communicationAuditLog.findFirst({
      where: { userId: user.id },
    });
    expect(auditLog).toBeNull();
  });
});
