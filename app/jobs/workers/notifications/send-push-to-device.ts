import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import { webpush } from "$/utils/web-push";
import type { Job } from "bullmq";
import { WebPushError } from "web-push";

// Narrowed to just the one method used here, so tests can pass a mock
// client without going through the mock.module() this repo avoids -- see
// send-email.ts's sendEmail(job, resend) for the same pattern.
type WebPushClient = Pick<typeof webpush, "sendNotification">;

export const NOTIFICATIONS__SEND_PUSH_TO_DEVICE =
  "notifications__send_push_to_device";

export interface SendPushToDeviceJobData {
  subscriptionId: string;
  title: string;
  body: string | null;
  referenceUrl: string | null;
}

// One job per device (see send-push-notification.ts) so a failure sending
// to one endpoint retries in isolation via the shared defaultJobOptions,
// without re-pinging devices that already succeeded.
//
// Mirrors send-email.ts's CommunicationAuditLog lifecycle: create the log
// before attempting the send, delete-and-rethrow on a retryable failure (so
// the retried attempt logs cleanly from scratch), but keep the log when the
// subscription is permanently gone (404/410) -- that's a completed attempt
// with a real outcome, not something being retried.
export async function sendPushToDevice(
  job: Job<SendPushToDeviceJobData>,
  webpushClient: WebPushClient,
) {
  const logger = getLogger(job);
  const { subscriptionId, title, body, referenceUrl } = job.data;

  const subscription = await db.pushSubscription.findUnique({
    where: { id: subscriptionId },
  });
  if (!subscription) {
    return "No-op: subscription no longer exists.";
  }

  const auditLog = await db.communicationAuditLog.create({
    data: {
      communicationType: "push",
      to: subscription.endpoint,
      subject: title,
      content: body,
      userId: subscription.userId,
    },
  });

  try {
    await webpushClient.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify({
        title,
        body,
        referenceUrl,
        notificationId: auditLog.id,
      }),
    );
    return "sent";
  } catch (err) {
    if (
      err instanceof WebPushError &&
      (err.statusCode === 404 || err.statusCode === 410)
    ) {
      await db.pushSubscription
        .delete({ where: { id: subscriptionId } })
        .catch(() => {});
      return "Subscription gone -- pruned.";
    }

    logger.error("Failed to send push notification", {
      error: err,
      subscriptionId,
    });
    await db.communicationAuditLog.delete({ where: { id: auditLog.id } });
    throw err; // isolated retry -- only this device
  }
}

const sendPushToDeviceJob = defineJob<SendPushToDeviceJobData>({
  name: NOTIFICATIONS__SEND_PUSH_TO_DEVICE,
  processor: (job) => sendPushToDevice(job, webpush),
  defaultJobOptions,
});

export const { queue: sendPushToDeviceQueue, worker: sendPushToDeviceWorker } =
  sendPushToDeviceJob;

export default sendPushToDeviceJob;
