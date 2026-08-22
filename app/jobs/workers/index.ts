import { registry } from "$/jobs/registry";
import { dbIpCheckQueue } from "$/jobs/workers/db-ip/check-db-ip";
import { cleanupOrphanedPadUsRuns } from "$/jobs/workers/protected-areas/cleanup-orphaned-runs";
import { logger } from "$/utils/logger";

await cleanupOrphanedPadUsRuns();
await dbIpCheckQueue.add("app-start", {});

// Each scheduler is registered independently -- one queue's scheduler
// failing to upsert (e.g. a stale/colliding job id in Redis) must not stop
// the others from registering, and must never stop worker.run() below from
// running for every queue, scheduled or not.
for (const entry of registry) {
  if (entry.kind === "job") {
    if (entry.schedule) {
      try {
        await entry.queue.upsertJobScheduler(entry.schedule.id, {
          pattern: entry.schedule.pattern,
          tz: entry.schedule.tz,
        });
      } catch (error) {
        logger.error(
          `Failed to upsert job scheduler "${entry.schedule.id}" for queue "${entry.name}"`,
          { error },
        );
      }
    }
  } else {
    for (const member of entry.members) {
      if (member.schedule) {
        try {
          await entry.queue.upsertJobScheduler(
            member.schedule.id,
            { pattern: member.schedule.pattern, tz: member.schedule.tz },
            {
              name: member.name,
              ...(member.defaultJobOptions
                ? { opts: member.defaultJobOptions }
                : {}),
            },
          );
        } catch (error) {
          logger.error(
            `Failed to upsert job scheduler "${member.schedule.id}" for queue "${entry.name}"`,
            { error },
          );
        }
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
