import { redisConnection } from "$/jobs/workers/default-options";
import { EMAILS__RESET_PASSWORD_WORKER } from "$/jobs/workers/email/reset-password";
import { TRIPS__MOVE_TO_FINISHED_WORKER } from "$/jobs/workers/trip-status/move-to-finished";
import { TRIPS__MOVE_TO_IN_PROGRESS_WORKER } from "$/jobs/workers/trip-status/move-to-in-progress";
import { Queue } from "bullmq";

export const moveToInProgressQueue = new Queue(
  TRIPS__MOVE_TO_IN_PROGRESS_WORKER,
  { connection: redisConnection },
);

export const moveToFinishedQueue = new Queue(TRIPS__MOVE_TO_FINISHED_WORKER, {
  connection: redisConnection,
});

export const sendResetPasswordEmailQueue = new Queue(
  EMAILS__RESET_PASSWORD_WORKER,
  {
    connection: redisConnection,
  },
);

export const allQueues = [
  moveToInProgressQueue,
  moveToFinishedQueue,
  sendResetPasswordEmailQueue,
];
