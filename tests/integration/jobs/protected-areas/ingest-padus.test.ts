import {
  PROTECTED_AREAS__INGEST_PADUS_WORKER,
  convertGdbToCsv,
  downloadPadUsZip,
  ingestPadUs,
  ingestProtectedAreasCsv,
  type IngestPadUsData,
} from "$/jobs/workers/protected-areas/ingest-padus";
import { db } from "$/utils/db";
import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FIXTURES_DIR = path.join(import.meta.dir, "../../../fixtures");
const SAMPLE_CSV = path.join(FIXTURES_DIR, "padus-sample.csv");
const SAMPLE_GDB_ZIP = path.join(FIXTURES_DIR, "padus-sample-gdb.zip");

const CSV_HEADER =
  "sourceUniqueId,unitName,localName,category,managerType,managerName,ownerType,ownerName,designationType,localDesignation,gapStatus,iucnCategory,publicAccess,dateEstablished,acres,aggregatorSource,wdpaCode,state,longitude,latitude";

const FAKE_ZIP_DOWNLOAD_URL = "https://example.com/padus-fixture.zip";

let userId: string;

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

function makeJob(
  data: Partial<IngestPadUsData> = {},
  updateProgress: ReturnType<
    typeof mock<(progress: { processed: number; total: number }) => void>
  > = mock((_progress: { processed: number; total: number }) => {}),
) {
  return {
    id: "test-job-id",
    name: PROTECTED_AREAS__INGEST_PADUS_WORKER,
    data: { zipDownloadUrl: FAKE_ZIP_DOWNLOAD_URL, ...data },
    updateProgress,
  } as unknown as Job<IngestPadUsData>;
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "padus-test-"));
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

describe("convertGdbToCsv", () => {
  it("converts a fixture GDB zip into a CSV with a computed centroid, via real GDAL", async () => {
    const tempDir = makeTempDir();

    const csvPath = await convertGdbToCsv(SAMPLE_GDB_ZIP, tempDir);

    const csvContent = await Bun.file(csvPath).text();
    const lines = csvContent.trim().split("\n");
    expect(lines.length).toBe(6); // header + 5 fixture rows
    expect(lines[0]).toBe(CSV_HEADER);
    expect(csvContent).toContain("Test National Forest");
    expect(csvContent).toContain("-105.5");
    expect(csvContent).toContain("39.5");
  });
});

describe("downloadPadUsZip", () => {
  it("streams the fetch response body to <destDir>/padus.zip", async () => {
    const tempDir = makeTempDir();
    const bytes = new TextEncoder().encode("fake zip contents");
    const fetchImpl = mock(
      async () => new Response(bytes, { status: 200 }),
    ) as unknown as typeof fetch;

    const zipPath = await downloadPadUsZip(
      tempDir,
      FAKE_ZIP_DOWNLOAD_URL,
      fetchImpl,
    );

    expect(zipPath).toBe(path.join(tempDir, "padus.zip"));
    expect(new Uint8Array(await Bun.file(zipPath).bytes())).toEqual(bytes);
  });

  it("throws when the response is not ok", async () => {
    const tempDir = makeTempDir();
    const fetchImpl = mock(
      async () =>
        new Response(null, { status: 500, statusText: "Server Error" }),
    ) as unknown as typeof fetch;

    await expect(
      downloadPadUsZip(tempDir, FAKE_ZIP_DOWNLOAD_URL, fetchImpl),
    ).rejects.toThrow(/Failed to download PAD-US zip/);
  });
});

describe("ingestPadUs", () => {
  it("wires download, convert, and ingest together and records a succeeded run", async () => {
    const zipBytes = await Bun.file(SAMPLE_GDB_ZIP).bytes();
    const fetchImpl = mock(
      async () => new Response(zipBytes, { status: 200 }),
    ) as unknown as typeof fetch;
    const job = makeJob({ initiatedByUserId: userId });

    const result = await ingestPadUs(job, fetchImpl);

    expect(result).toEqual({
      processedCount: 5,
      createdCount: 5,
      updatedCount: 0,
    });

    const run = await db.protectedAreaIngestRun.findFirstOrThrow({
      where: { jobId: "test-job-id" },
      orderBy: { startedAt: "desc" },
    });
    expect(run).toMatchObject({
      status: "succeeded",
      source: "PAD-US 4.1 Combined",
      itemsProcessed: 5,
      itemsCreated: 5,
      itemsUpdated: 0,
      initiatedByUserId: userId,
    });
    expect(run.finishedAt).not.toBeNull();
  });

  it("records a failed run with an error message when a step throws, and still leaves no temp dir behind", async () => {
    const fetchImpl = mock(
      async () =>
        new Response(null, { status: 500, statusText: "Server Error" }),
    ) as unknown as typeof fetch;
    const job = makeJob();
    const tmpEntriesBefore = fs.readdirSync(os.tmpdir()).length;

    await expect(ingestPadUs(job, fetchImpl)).rejects.toThrow(
      /Failed to download PAD-US zip/,
    );

    const run = await db.protectedAreaIngestRun.findFirstOrThrow({
      where: { jobId: "test-job-id" },
      orderBy: { startedAt: "desc" },
    });
    expect(run.status).toBe("failed");
    expect(run.errorMessage).toContain("Failed to download PAD-US zip");
    expect(run.finishedAt).not.toBeNull();
    expect(fs.readdirSync(os.tmpdir()).length).toBe(tmpEntriesBefore);
  });
});
