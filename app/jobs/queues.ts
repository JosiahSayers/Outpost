import { JOBS__MOVE_TO_IN_PROGRESS_WORKER } from "$/jobs/workers/trip-status/move-to-in-progress";
import { Queue } from "bullmq";

export const moveToInProgressQueue = new Queue(
  JOBS__MOVE_TO_IN_PROGRESS_WORKER,
);

export const allQueues = [moveToInProgressQueue];
