import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultWorkerOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import { Worker, type Job } from "bullmq";
import fs from "node:fs";

export const PROTECTED_AREAS__FINALIZE_PADUS_INGEST_WORKER =
  "protected_areas__finalize_padus_ingest";

export interface FinalizePadUsIngestData {
  runId: string;
  destDir: string;
}

interface ChunkResult {
  processedCount: number;
  createdCount: number;
  updatedCount: number;
}

// Runs once every ingest-chunk child job has settled (success or failure --
// children are added with ignoreDependencyOnFailure so a failed chunk
// doesn't stop this from ever running). Sums up the results, gives the
// ingest run a real terminal status, and owns cleanup of the shared temp
// directory since chunk files must outlive the prepare job that created them.
export async function finalizePadUsIngest(job: Job<FinalizePadUsIngestData>) {
  const logger = getLogger(job);
  const { runId, destDir } = job.data;

  try {
    const succeeded = ((await job.getChildrenValues()) ?? {}) as Record<
      string,
      ChunkResult
    >;
    const failed = (await job.getIgnoredChildrenFailures()) ?? {};

    const totals = Object.values(succeeded).reduce(
      (acc, result) => ({
        processedCount: acc.processedCount + result.processedCount,
        createdCount: acc.createdCount + result.createdCount,
        updatedCount: acc.updatedCount + result.updatedCount,
      }),
      { processedCount: 0, createdCount: 0, updatedCount: 0 },
    );

    const failedCount = Object.keys(failed).length;
    const chunkCount = Object.keys(succeeded).length + failedCount;

    await db.protectedAreaIngestRun.update({
      where: { id: runId },
      data:
        failedCount > 0
          ? {
              status: "failed",
              finishedAt: new Date(),
              itemsProcessed: totals.processedCount,
              itemsCreated: totals.createdCount,
              itemsUpdated: totals.updatedCount,
              errorMessage: `${failedCount} of ${chunkCount} ingest chunk(s) failed`,
            }
          : {
              status: "succeeded",
              finishedAt: new Date(),
              itemsProcessed: totals.processedCount,
              itemsCreated: totals.createdCount,
              itemsUpdated: totals.updatedCount,
            },
    });

    if (failedCount > 0) {
      throw new Error(
        `${failedCount} of ${chunkCount} PAD-US ingest chunk(s) failed`,
      );
    }

    return totals;
  } catch (err) {
    logger.error("PAD-US ingest finalize failed", { error: err });
    throw err;
  } finally {
    await fs.promises.rm(destDir, { recursive: true, force: true });
  }
}

export const finalizePadUsIngestWorker = new Worker<FinalizePadUsIngestData>(
  PROTECTED_AREAS__FINALIZE_PADUS_INGEST_WORKER,
  (job) => finalizePadUsIngest(job),
  // Generous lock for consistency with the other PAD-US workers, so this can't
  // lapse if the box is still under load when the chunks finish settling.
  { ...defaultWorkerOptions, lockDuration: 60 * 60_000 }, // 1 hour
);
