import { FROM_ADDRESSES, resend } from "$/emails/resend-client";
import MealPlanReminderEmail from "$/emails/meal-plan-reminder";
import PasswordChangedEmail from "$/emails/password-changed";
import ResetPasswordEmail from "$/emails/reset-password";
import TripStatusUpdateEmail from "$/emails/trip-status-update";
import VerifyEmail from "$/emails/verify-email";
import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { Notifications } from "$/utils/notifications";
import type { Job } from "bullmq";
import { jsx } from "react/jsx-runtime";
import type { Resend } from "resend";

export const EMAILS__SEND_EMAIL_WORKER = "emails__send_email";

// Job data crosses BullMQ's Redis boundary as JSON, so the react element to
// render can't travel with it directly -- each producer picks a template by
// name and passes only its (serializable) props, mirroring how
// createNotification's `icon` is a name rather than a component.
export type EmailContent =
  | {
      template: "password-changed";
      props: { userName: string | null };
    }
  | {
      template: "reset-password";
      props: { userName: string | null; resetUrl: string };
    }
  | {
      template: "verify-email";
      props: { userName: string | null; verifyUrl: string };
    }
  | {
      template: "trip-status-update";
      props: {
        userName: string | null;
        title: string;
        description: string;
        tripName: string;
        tripUrl: string;
      };
    }
  | {
      template: "meal-plan-reminder";
      props: {
        userName: string | null;
        tripName: string;
        tripStartDate: string;
        tripUrl: string;
        unpurchasedCount: number;
        previewItemNames: string[];
        remainingCount: number;
      };
    };

export interface SendEmailJobData {
  userId: string;
  to: string;
  // Every producer currently sends the same line per template, so this is
  // optional and defaults from DEFAULT_SUBJECTS below -- only set it to
  // override that default.
  subject?: string;
  notificationSettingName: string | null;
  content: EmailContent;
}

const DEFAULT_SUBJECTS: Record<EmailContent["template"], string> = {
  "password-changed": "Outpost Password Changed",
  "reset-password": "Outpost Password Reset",
  "verify-email": "Verify your Outpost email",
  "trip-status-update": "Outpost Trip Update",
  "meal-plan-reminder": "Outpost Meal Plan Reminder",
};

function renderEmail(content: EmailContent) {
  switch (content.template) {
    case "password-changed":
      return jsx(PasswordChangedEmail, content.props);
    case "reset-password":
      return jsx(ResetPasswordEmail, content.props);
    case "verify-email":
      return jsx(VerifyEmail, content.props);
    case "trip-status-update":
      return jsx(TripStatusUpdateEmail, content.props);
    case "meal-plan-reminder":
      return jsx(MealPlanReminderEmail, content.props);
  }
}

export async function sendEmail(
  job: Job<SendEmailJobData>,
  resendClient: Resend,
) {
  const logger = getLogger(job);
  const {
    userId,
    to,
    subject: subjectOverride,
    notificationSettingName,
    content,
  } = job.data;

  // Some emails (ex. auth flows) don't have an account setting to check
  if (notificationSettingName !== null) {
    const accountSetting = await db.accountSetting.findUnique({
      where: {
        slug: Notifications.getSlug(notificationSettingName, "email"),
      },
      include: {
        accountSettingValues: { where: { userId } },
      },
    });

    if (!accountSetting) {
      logger.error("tried to check unknown notification setting", {
        notificationSettingName,
      });
      throw new Error("Notification does not exist");
    }

    const setting = transformers.userAccountSetting(accountSetting);
    if (setting.value !== "true") {
      return "No email sent. User has this notification disabled.";
    }
  }

  if (Bun.env.NODE_ENV !== "production") {
    logger.info("Skipping email send in lower environment", {
      jobData: job.data,
    });
    return { resendEmailId: "JOB_SKIPPED_IN_LOWER_ENVIRONMENT" };
  }

  const from = FROM_ADDRESSES.NO_REPLY;
  const subject = subjectOverride ?? DEFAULT_SUBJECTS[content.template];
  const react = renderEmail(content);

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

const sendEmailJob = defineJob<SendEmailJobData>({
  name: EMAILS__SEND_EMAIL_WORKER,
  processor: async (job) => sendEmail(job, resend),
  defaultJobOptions,
});

export const { queue: sendEmailQueue, worker: sendEmailWorker } = sendEmailJob;

export default sendEmailJob;
