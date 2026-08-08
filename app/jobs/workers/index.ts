import { registry } from "$/jobs/registry";
import { cleanupOrphanedPadUsRuns } from "$/jobs/workers/protected-areas/cleanup-orphaned-runs";
import { logger } from "$/utils/logger";

await cleanupOrphanedPadUsRuns();

for (const entry of registry) {
  if (entry.kind === "job") {
    if (entry.schedule) {
      await entry.queue.upsertJobScheduler(entry.schedule.id, {
        pattern: entry.schedule.pattern,
      });
    }
  } else {
    for (const member of entry.members) {
      if (member.schedule) {
        await entry.queue.upsertJobScheduler(
          member.schedule.id,
          { pattern: member.schedule.pattern },
          {
            name: member.name,
            ...(member.defaultJobOptions
              ? { opts: member.defaultJobOptions }
              : {}),
          },
        );
      }
    }
  }
}

registry.forEach((entry) => entry.worker.run());

process.on("SIGINT", async () => {
  logger.info("Gracefully stopping workers...");
  await Promise.allSettled(registry.map((job) => job.worker.close()));
  process.exit();
});
