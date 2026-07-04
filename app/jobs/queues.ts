import { redisConnection } from "$/jobs/workers/default-options";
import { JOBS__MOVE_TO_IN_PROGRESS_WORKER } from "$/jobs/workers/trip-status/move-to-in-progress";
import { Queue } from "bullmq";

export const moveToInProgressQueue = new Queue(
  JOBS__MOVE_TO_IN_PROGRESS_WORKER,
  { connection: redisConnection },
);

export const allQueues = [moveToInProgressQueue];
