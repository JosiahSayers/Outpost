import {
  PROTECTED_AREAS__FINALIZE_PADUS_INGEST_WORKER,
  finalizePadUsIngest,
  type FinalizePadUsIngestData,
} from "$/jobs/workers/protected-areas/finalize-padus-ingest";
import { db } from "$/utils/db";
import type { Job } from "bullmq";
import { beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let userId: string;

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

async function makeRun() {
  return db.protectedAreaIngestRun.create({
    data: {
      source: "PAD-US 4.1 Combined",
      jobId: "test-finalize-job-id",
      initiatedByUserId: userId,
    },
  });
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "padus-finalize-test-"));
}

function makeJob(
  data: FinalizePadUsIngestData,
  succeeded: Record<string, unknown>,
  failed: Record<string, unknown> = {},
) {
  return {
    id: "test-finalize-job-id",
    name: PROTECTED_AREAS__FINALIZE_PADUS_INGEST_WORKER,
    data,
    getChildrenValues: async () => succeeded,
    getIgnoredChildrenFailures: async () => failed,
  } as unknown as Job<FinalizePadUsIngestData>;
}

describe("finalizePadUsIngest", () => {
  it("sums child results, marks the run succeeded, and removes the temp dir", async () => {
    const run = await makeRun();
    const destDir = makeTempDir();
    fs.writeFileSync(path.join(destDir, "chunk-00000.csv"), "leftover");

    const job = makeJob(
      { runId: run.id, destDir },
      {
        "chunk-0": { processedCount: 5, createdCount: 5, updatedCount: 0 },
        "chunk-1": { processedCount: 3, createdCount: 1, updatedCount: 2 },
      },
    );

    const result = await finalizePadUsIngest(job);

    expect(result).toEqual({
      processedCount: 8,
      createdCount: 6,
      updatedCount: 2,
    });

    const updatedRun = await db.protectedAreaIngestRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    expect(updatedRun).toMatchObject({
      status: "succeeded",
      itemsProcessed: 8,
      itemsCreated: 6,
      itemsUpdated: 2,
    });
    expect(updatedRun.finishedAt).not.toBeNull();
    expect(fs.existsSync(destDir)).toBe(false);
  });

  it("marks the run failed and still removes the temp dir when some chunks failed", async () => {
    const run = await makeRun();
    const destDir = makeTempDir();

    const job = makeJob(
      { runId: run.id, destDir },
      { "chunk-0": { processedCount: 5, createdCount: 5, updatedCount: 0 } },
      { "chunk-1": "some error" },
    );

    await expect(finalizePadUsIngest(job)).rejects.toThrow(
      /1 of 2 PAD-US ingest chunk\(s\) failed/,
    );

    const updatedRun = await db.protectedAreaIngestRun.findUniqueOrThrow({
      where: { id: run.id },
    });
    expect(updatedRun).toMatchObject({
      status: "failed",
      itemsProcessed: 5,
      itemsCreated: 5,
      itemsUpdated: 0,
      errorMessage: "1 of 2 ingest chunk(s) failed",
    });
    expect(updatedRun.finishedAt).not.toBeNull();
    expect(fs.existsSync(destDir)).toBe(false);
  });
});
