import { FROM_ADDRESSES, resend } from "$/emails/resend-client";
import PasswordChangedEmail from "$/emails/password-changed";
import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import type { User } from "better-auth/types";
import type { Job } from "bullmq";
import { jsx } from "react/jsx-runtime";
import type { Resend } from "resend";

export const EMAILS__PASSWORD_CHANGED_WORKER = "emails__password_changed";

export interface SendPasswordChangedEmailData {
  user: User;
}

export async function sendPasswordChangedEmail(
  job: Job<SendPasswordChangedEmailData>,
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
  const subject = "Outpost Password Changed";
  const react = jsx(PasswordChangedEmail, {
    userName: job.data.user.name,
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

const sendPasswordChangedEmailJob = defineJob<SendPasswordChangedEmailData>({
  name: EMAILS__PASSWORD_CHANGED_WORKER,
  processor: async (job) => sendPasswordChangedEmail(job, resend),
  defaultJobOptions,
});

export const {
  queue: sendPasswordChangedEmailQueue,
  worker: sendPasswordChangedEmailWorker,
} = sendPasswordChangedEmailJob;

export default sendPasswordChangedEmailJob;
