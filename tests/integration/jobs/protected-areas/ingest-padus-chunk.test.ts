import {
  PROTECTED_AREAS__INGEST_PADUS_CHUNK_WORKER,
  ingestPadUsChunk,
  ingestProtectedAreasCsv,
  type IngestPadUsChunkData,
} from "$/jobs/workers/protected-areas/ingest-padus-chunk";
import { db } from "$/utils/db";
import type { Job } from "bullmq";
import { describe, expect, it, mock } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FIXTURES_DIR = path.join(import.meta.dir, "../../../fixtures");
const SAMPLE_CSV = path.join(FIXTURES_DIR, "padus-sample.csv");

const CSV_HEADER =
  "sourceUniqueId,unitName,localName,category,managerType,managerName,ownerType,ownerName,designationType,localDesignation,gapStatus,iucnCategory,publicAccess,dateEstablished,acres,aggregatorSource,wdpaCode,state,longitude,latitude";

function makeJob(
  data: Partial<IngestPadUsChunkData> = {},
  updateProgress: ReturnType<
    typeof mock<(progress: { processed: number; total: number }) => void>
  > = mock((_progress: { processed: number; total: number }) => {}),
) {
  return {
    id: "test-chunk-job-id",
    name: PROTECTED_AREAS__INGEST_PADUS_CHUNK_WORKER,
    data: { runId: "test-run-id", chunkPath: SAMPLE_CSV, ...data },
    updateProgress,
  } as unknown as Job<IngestPadUsChunkData>;
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "padus-chunk-test-"));
}

describe("ingestProtectedAreasCsv", () => {
  it("inserts rows from the fixture CSV, mapping fields and nulling blanks", async () => {
    const result = await ingestProtectedAreasCsv(SAMPLE_CSV, makeJob());

    expect(result).toEqual({
      processedCount: 5,
      createdCount: 5,
      updatedCount: 0,
    });

    const forest = await db.protectedArea.findUniqueOrThrow({
      where: { sourceUniqueId: "1000001" },
    });
    expect(forest).toMatchObject({
      unitName: "Test National Forest",
      localName: "Test Ranger District",
      category: "fee",
      managerType: "FED",
      managerName: "USFS",
      state: "CO",
      latitude: 39.5,
      longitude: -105.5,
      acres: 123456.7,
      dateEstablished: 1908,
      aggregatorSource: "PADUS4_1",
      wdpaCode: "1234",
    });

    const wilderness = await db.protectedArea.findUniqueOrThrow({
      where: { sourceUniqueId: "1000002" },
    });
    expect(wilderness.category).toBe("designation");
    expect(wilderness.localName).toBeNull();
    expect(wilderness.wdpaCode).toBeNull();
  });

  it("upserts by sourceUniqueId on re-ingest instead of creating duplicates", async () => {
    await ingestProtectedAreasCsv(SAMPLE_CSV, makeJob());
    const countAfterFirst = await db.protectedArea.count();

    const tempDir = makeTempDir();
    const modifiedCsvPath = path.join(tempDir, "modified.csv");
    const original = await Bun.file(SAMPLE_CSV).text();
    await Bun.write(modifiedCsvPath, original.replace("123456.7", "999999.9"));

    const result = await ingestProtectedAreasCsv(modifiedCsvPath, makeJob());

    expect(result).toEqual({
      processedCount: 5,
      createdCount: 0,
      updatedCount: 5,
    });
    expect(await db.protectedArea.count()).toBe(countAfterFirst);

    const forest = await db.protectedArea.findUniqueOrThrow({
      where: { sourceUniqueId: "1000001" },
    });
    expect(forest.acres).toBe(999999.9);
  });

  it("processes every row across multiple batches and reports increasing progress", async () => {
    const tempDir = makeTempDir();
    const csvPath = path.join(tempDir, "large.csv");
    const count = 1200;
    const rows = Array.from(
      { length: count },
      (_, i) =>
        `batch-${i},Batch Area ${i},,Fee,FED,USFS,FED,USFS,NF,,2,VI,OA,1990,100.0,PADUS4_1,,CO,-105.0,39.0`,
    );
    await Bun.write(csvPath, [CSV_HEADER, ...rows].join("\n") + "\n");

    const updateProgress = mock(
      (_progress: { processed: number; total: number }) => {},
    );
    const result = await ingestProtectedAreasCsv(
      csvPath,
      makeJob({}, updateProgress),
    );

    expect(result).toEqual({
      processedCount: count,
      createdCount: count,
      updatedCount: 0,
    });
    expect(await db.protectedArea.count()).toBe(count);

    expect(updateProgress.mock.calls.length).toBeGreaterThanOrEqual(2);
    const processedValues = updateProgress.mock.calls.map(
      (call) => call[0].processed,
    );
    for (let i = 1; i < processedValues.length; i++) {
      expect(processedValues[i]).toBeGreaterThan(processedValues[i - 1]!);
    }
    expect(processedValues.at(-1)).toBe(count);
  });
});

describe("ingestPadUsChunk", () => {
  it("ingests the chunk file at job.data.chunkPath and returns the totals", async () => {
    const result = await ingestPadUsChunk(makeJob());

    expect(result).toEqual({
      processedCount: 5,
      createdCount: 5,
      updatedCount: 0,
    });
  });
});
