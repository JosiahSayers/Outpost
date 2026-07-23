import { PADUS_TEMP_ROOT } from "$/jobs/workers/protected-areas/ingest-padus";
import { db } from "$/utils/db";
import { logger } from "$/utils/logger";
import fs from "node:fs";

// A PAD-US ingest run's temp directory and DB row only get cleaned up by the
// job code itself (prepare job's catch block, or the finalize job) as long
// as the worker process stays alive. If the process was killed mid-run (OOM,
// deploy, manual restart) neither ever runs, leaving an orphaned temp
// directory and a run stuck showing "running" forever. Since this
// deployment runs a single `jobs` process, anything left over at boot time
// is provably from a now-dead process and safe to clean up unconditionally.
export async function cleanupOrphanedPadUsRuns() {
  await fs.promises.rm(PADUS_TEMP_ROOT, { recursive: true, force: true });

  const { count } = await db.protectedAreaIngestRun.updateMany({
    where: { status: "running" },
    data: {
      status: "failed",
      finishedAt: new Date(),
      errorMessage: "Worker process restarted before this run finished",
    },
  });
  if (count > 0) {
    logger.warn(
      `Marked ${count} orphaned PAD-US ingest run(s) as failed on worker startup`,
    );
  }
}
