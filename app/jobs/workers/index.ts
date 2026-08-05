import { registry } from "$/jobs/registry";
import { cleanupOrphanedPadUsRuns } from "$/jobs/workers/protected-areas/cleanup-orphaned-runs";
import { logger } from "$/utils/logger";

await cleanupOrphanedPadUsRuns();

for (const job of registry) {
  if (job.schedule) {
    await job.queue.upsertJobScheduler(job.schedule.id, {
      pattern: job.schedule.pattern,
    });
  }
}

registry.forEach((job) => job.worker.run());

process.on("SIGINT", async () => {
  logger.info("Gracefully stopping workers...");
  await Promise.allSettled(registry.map((job) => job.worker.close()));
  process.exit();
});
