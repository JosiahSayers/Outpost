import { FROM_ADDRESSES, resend } from "$/emails/resend-client";
import ResetPasswordEmail from "$/emails/reset-password";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultWorkerOptions } from "$/jobs/workers/default-options";
import type { User } from "better-auth/types";
import { Worker, type Job } from "bullmq";
import { jsx } from "react/jsx-runtime";
import type { Resend } from "resend";

export const EMAILS__RESET_PASSWORD_WORKER = "emails__reset_password";

export interface SendResetPasswordEmailData {
  user: User;
  url: string;
}

export async function sendResetPasswordEmail(
  job: Job<SendResetPasswordEmailData>,
  resendClient: Resend,
) {
  const logger = getLogger(job);

  if (Bun.env.NODE_ENV !== "production") {
    logger.info("Skipping email send in lower environment", {
      jobData: job.data,
    });
    return { resendEmailId: "JOB_SKIPPED_IN_LOWER_ENVIRONMENT" };
  }

  const { data, error } = await resendClient.emails.send({
    from: FROM_ADDRESSES.NO_REPLY,
    to: [job.data.user.email],
    subject: "Outpost Password Reset",
    react: jsx(ResetPasswordEmail, {
      userName: job.data.user.name,
      resetUrl: job.data.url,
    }),
  });

  if (error) {
    logger.error(error);
    throw error;
  }

  return { resendEmailId: data?.id };
}

export const sendResetPasswordEmailWorker =
  new Worker<SendResetPasswordEmailData>(
    EMAILS__RESET_PASSWORD_WORKER,
    async (job) => sendResetPasswordEmail(job, resend),
    defaultWorkerOptions,
  );
