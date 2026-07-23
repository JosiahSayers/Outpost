import { cleanupOrphanedPadUsRuns } from "$/jobs/workers/protected-areas/cleanup-orphaned-runs";
import { PADUS_TEMP_ROOT } from "$/jobs/workers/protected-areas/ingest-padus";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import path from "node:path";

let userId: string;

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

describe("cleanupOrphanedPadUsRuns", () => {
  it("removes leftover temp dirs and marks running runs as failed", async () => {
    await fs.promises.mkdir(PADUS_TEMP_ROOT, { recursive: true });
    fs.writeFileSync(path.join(PADUS_TEMP_ROOT, "leftover.txt"), "orphaned");

    const run = await db.protectedAreaIngestRun.create({
      data: {
        source: "PAD-US 4.1 Combined",
        jobId: "orphaned-job-id",
        initiatedByUserId: userId,
      },
    });

    await cleanupOrphanedPadUsRuns();

    expect(fs.existsSync(PADUS_TEMP_ROOT)).toBe(false);

    const updatedRun = await db.protectedAreaIngestRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    expect(updatedRun.status).toBe("failed");
    expect(updatedRun.errorMessage).toBe(
      "Worker process restarted before this run finished",
    );
    expect(updatedRun.finishedAt).not.toBeNull();
  });

  it("leaves succeeded/failed runs untouched", async () => {
    const run = await db.protectedAreaIngestRun.create({
      data: {
        source: "PAD-US 4.1 Combined",
        jobId: "already-succeeded-job-id",
        initiatedByUserId: userId,
        status: "succeeded",
        finishedAt: new Date(),
      },
    });

    await cleanupOrphanedPadUsRuns();

    const updatedRun = await db.protectedAreaIngestRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    expect(updatedRun.status).toBe("succeeded");
    expect(updatedRun.errorMessage).toBeNull();
  });
});
