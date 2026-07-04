import { moveToInProgressQueue } from "$/jobs/queues";
import { moveToInProgressWorker } from "$/jobs/workers/trip-status/move-to-in-progress";
import { logger } from "$/utils/logger";
import type { Worker } from "bullmq";

const workers: Worker[] = [moveToInProgressWorker];

await moveToInProgressQueue.upsertJobScheduler("move-to-in-progress-nightly", {
  pattern: "1 0 * * *",
  tz: "UTC",
});

workers.forEach((worker) => worker.run());

process.on("SIGINT", async () => {
  logger.info("Gracefully stopping workers...");
  await Promise.allSettled(workers.map((worker) => worker.close()));
  process.exit();
});
