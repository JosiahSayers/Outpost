import { FROM_ADDRESSES, resend } from "$/emails/resend-client";
import VerifyEmail from "$/emails/verify-email";
import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import type { User } from "better-auth/types";
import type { Job } from "bullmq";
import { jsx } from "react/jsx-runtime";
import type { Resend } from "resend";

export const EMAILS__VERIFY_EMAIL_WORKER = "emails__verify_email";

export interface SendVerifyEmailData {
  user: User;
  url: string;
}

export async function sendVerifyEmail(
  job: Job<SendVerifyEmailData>,
  resendClient: Resend,
) {
  const logger = getLogger(job);

  if (Bun.env.NODE_ENV !== "production") {
    logger.info("Skipping email send in lower environment", {
      jobData: job.data,
    });
    return { resendEmailId: "JOB_SKIPPED_IN_LOWER_ENVIRONMENT" };
  }

  const from = FROM_ADDRESSES.NO_REPLY;
  const to = job.data.user.email;
  const subject = "Verify your Outpost email";
  const react = jsx(VerifyEmail, {
    userName: job.data.user.name,
    verifyUrl: job.data.url,
  });

  const auditLog = await db.communicationAuditLog.create({
    data: {
      communicationType: "email",
      from,
      to,
      subject,
      userId: job.data.user.id,
    },
  });

  const { data, error } = await resendClient.emails.send({
    from,
    to,
    subject,
    react,
  });

  if (error) {
    logger.error(error);
    await db.communicationAuditLog.delete({ where: { id: auditLog.id } });
    throw error;
  }

  await db.communicationAuditLog.update({
    where: { id: auditLog.id },
    data: { thirdPartyId: data?.id },
  });
  return { resendEmailId: data?.id };
}

const sendVerifyEmailJob = defineJob<SendVerifyEmailData>({
  name: EMAILS__VERIFY_EMAIL_WORKER,
  processor: async (job) => sendVerifyEmail(job, resend),
  defaultJobOptions,
});

export const { queue: sendVerifyEmailQueue, worker: sendVerifyEmailWorker } =
  sendVerifyEmailJob;

export default sendVerifyEmailJob;
