import { FROM_ADDRESSES, resend } from "$/emails/resend-client";
import { emailAppUrl } from "$/emails/theme";
import TripStatusUpdateEmail from "$/emails/trip-status-update";
import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { Job } from "bullmq";
import { jsx } from "react/jsx-runtime";
import type { Resend } from "resend";

export const EMAILS__TRIP_STATUS_UPDATE_WORKER = "emails__trip_status_update";

const NOTIFICATION_NAME = "trip_status_update";

export interface SendTripStatusUpdateEmailJobData {
  userId: string;
  userEmail: string;
  userName: string | null;
  title: string;
  description: string;
  tripName: string;
  referenceUrl: string;
}

export async function sendTripStatusUpdateEmail(
  job: Job<SendTripStatusUpdateEmailJobData>,
  resendClient: Resend,
) {
  const logger = getLogger(job);
  const {
    userId,
    userEmail,
    userName,
    title,
    description,
    tripName,
    referenceUrl,
  } = job.data;

  const accountSetting = await db.accountSetting.findUnique({
    where: { slug: Notifications.getSlug(NOTIFICATION_NAME, "email") },
    include: { accountSettingValues: { where: { userId } } },
  });

  if (!accountSetting) {
    logger.error("tried to check unknown notification setting", {
      notificationSettingName: NOTIFICATION_NAME,
    });
    throw new Error("Notification does not exist");
  }

  const setting = transformers.userAccountSetting(accountSetting);
  if (setting.value !== "true") {
    return "No email sent. User has this notification disabled.";
  }

  if (Bun.env.NODE_ENV !== "production") {
    logger.info("Skipping email send in lower environment", {
      jobData: job.data,
    });
    return { resendEmailId: "JOB_SKIPPED_IN_LOWER_ENVIRONMENT" };
  }

  const from = FROM_ADDRESSES.NO_REPLY;
  const to = userEmail;
  const subject = "Outpost Trip Update";
  const react = jsx(TripStatusUpdateEmail, {
    userName,
    title,
    description,
    tripName,
    tripUrl: `${emailAppUrl}${referenceUrl}`,
  });

  const auditLog = await db.communicationAuditLog.create({
    data: { communicationType: "email", from, to, subject, userId },
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

const sendTripStatusUpdateEmailJob =
  defineJob<SendTripStatusUpdateEmailJobData>({
    name: EMAILS__TRIP_STATUS_UPDATE_WORKER,
    processor: async (job) => sendTripStatusUpdateEmail(job, resend),
    defaultJobOptions,
  });

export const {
  queue: sendTripStatusUpdateEmailQueue,
  worker: sendTripStatusUpdateEmailWorker,
} = sendTripStatusUpdateEmailJob;

export default sendTripStatusUpdateEmailJob;
