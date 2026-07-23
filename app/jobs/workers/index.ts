import { moveToFinishedQueue, moveToInProgressQueue } from "$/jobs/queues";
import { sendResetPasswordEmailWorker } from "$/jobs/workers/email/reset-password";
import { cleanupOrphanedPadUsRuns } from "$/jobs/workers/protected-areas/cleanup-orphaned-runs";
import { deriveCanonicalEntitiesWorker } from "$/jobs/workers/protected-areas/derive-canonical-entities";
import { finalizePadUsIngestWorker } from "$/jobs/workers/protected-areas/finalize-padus-ingest";
import { ingestPadUsChunkWorker } from "$/jobs/workers/protected-areas/ingest-padus-chunk";
import { ingestPadUsWorker } from "$/jobs/workers/protected-areas/ingest-padus";
import { moveToFinishedWorker } from "$/jobs/workers/trip-status/move-to-finished";
import { moveToInProgressWorker } from "$/jobs/workers/trip-status/move-to-in-progress";
import { logger } from "$/utils/logger";
import type { Worker } from "bullmq";

const workers: Worker[] = [
  moveToInProgressWorker,
  moveToFinishedWorker,
  sendResetPasswordEmailWorker,
  ingestPadUsWorker,
  ingestPadUsChunkWorker,
  finalizePadUsIngestWorker,
  deriveCanonicalEntitiesWorker,
];

await cleanupOrphanedPadUsRuns();

await moveToInProgressQueue.upsertJobScheduler("move-to-in-progress-nightly", {
  pattern: "1 0 * * *",
});

await moveToFinishedQueue.upsertJobScheduler("move-to-finished-nightly", {
  pattern: "1 0 * * *",
});

workers.forEach((worker) => worker.run());

process.on("SIGINT", async () => {
  logger.info("Gracefully stopping workers...");
  await Promise.allSettled(workers.map((worker) => worker.close()));
  process.exit();
});
