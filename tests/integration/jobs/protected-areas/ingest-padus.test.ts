import {
  protectedAreasFinalizeIngestQueue,
  protectedAreasIngestChunkQueue,
} from "$/jobs/queues";
import {
  PADUS_TEMP_ROOT,
  PROTECTED_AREAS__INGEST_PADUS_WORKER,
  convertGdbToCsv,
  downloadPadUsZip,
  ingestPadUs,
  splitCsvIntoChunks,
  type IngestPadUsData,
} from "$/jobs/workers/protected-areas/ingest-padus";
import type { FinalizePadUsIngestData } from "$/jobs/workers/protected-areas/finalize-padus-ingest";
import type { IngestPadUsChunkData } from "$/jobs/workers/protected-areas/ingest-padus-chunk";
import { db } from "$/utils/db";
import type { Job } from "bullmq";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { parse as parseSync } from "csv-parse/sync";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FIXTURES_DIR = path.join(import.meta.dir, "../../../fixtures");
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

function makeJob(data: Partial<IngestPadUsData> = {}) {
  return {
    id: "test-job-id",
    name: PROTECTED_AREAS__INGEST_PADUS_WORKER,
    data: { zipDownloadUrl: FAKE_ZIP_DOWNLOAD_URL, ...data },
    updateProgress: mock(async () => {}),
  } as unknown as Job<IngestPadUsData>;
}

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "padus-test-"));
}

describe("splitCsvIntoChunks", () => {
  it("splits rows across multiple chunk files, each carrying the header", async () => {
    const tempDir = makeTempDir();
    const csvPath = path.join(tempDir, "large.csv");
    const rows = Array.from(
      { length: 25 },
      (_, i) =>
        `row-${i},Area ${i},,Fee,FED,USFS,FED,USFS,NF,,2,VI,OA,1990,100.0,PADUS4_1,,CO,-105.0,39.0`,
    );
    await Bun.write(csvPath, [CSV_HEADER, ...rows].join("\n") + "\n");

    const { chunkPaths, totalRows } = await splitCsvIntoChunks(
      csvPath,
      tempDir,
      10,
    );

    expect(totalRows).toBe(25);
    expect(chunkPaths.length).toBe(3);

    const contents = await Promise.all(
      chunkPaths.map((p) => Bun.file(p).text()),
    );
    const lineCounts = contents.map(
      (c) => c.trim().split("\n").length - 1, // minus header
    );
    expect(lineCounts).toEqual([10, 10, 5]);
    for (const content of contents) {
      expect(content.split("\n")[0]).toBe(CSV_HEADER);
    }
    expect(contents[0]).toContain("row-0,");
    expect(contents[2]).toContain("row-24,");
  });

  it("keeps a quoted field with an embedded comma and newline intact across a chunk boundary", async () => {
    const tempDir = makeTempDir();
    const csvPath = path.join(tempDir, "quoted.csv");
    const plainRow = (i: number) =>
      `row-${i},Area ${i},,Fee,FED,USFS,FED,USFS,NF,,2,VI,OA,1990,100.0,PADUS4_1,,CO,-105.0,39.0`;
    // Last row of the first chunk (rowsPerChunk=2) has a quoted localName
    // containing both a comma and a real embedded newline -- exactly what
    // ogr2ogr emits for PAD-US text fields with punctuation. A naive
    // physical-line split cuts this row in half, corrupting both chunks.
    const rows = [
      plainRow(0),
      `row-1,Area 1,"Multi-line,\nlocal name",Fee,FED,USFS,FED,USFS,NF,,2,VI,OA,1990,100.0,PADUS4_1,,CO,-105.0,39.0`,
      plainRow(2),
      plainRow(3),
    ];
    await Bun.write(csvPath, [CSV_HEADER, ...rows].join("\n") + "\n");

    const { chunkPaths, totalRows } = await splitCsvIntoChunks(
      csvPath,
      tempDir,
      2,
    );

    expect(totalRows).toBe(4);
    expect(chunkPaths.length).toBe(2);

    const [chunk0, chunk1] = await Promise.all(
      chunkPaths.map((p) => Bun.file(p).text()),
    );

    const chunk0Records = parseSync(chunk0!, { columns: true }) as Array<
      Record<string, string>
    >;
    expect(chunk0Records.length).toBe(2);
    expect(chunk0Records[1]!.localName).toBe("Multi-line,\nlocal name");

    const chunk1Records = parseSync(chunk1!, { columns: true }) as Array<
      Record<string, string>
    >;
    expect(chunk1Records.length).toBe(2);
    expect(chunk1Records[0]!.sourceUniqueId).toBe("row-2");
    expect(chunk1Records[1]!.sourceUniqueId).toBe("row-3");
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
    const zipBytes = new TextEncoder().encode("fake zip contents");
    const fetchImpl = mock(
      async () => new Response(zipBytes, { status: 200 }),
    ) as unknown as typeof fetch;

    const { destPath, bytes } = await downloadPadUsZip(
      tempDir,
      FAKE_ZIP_DOWNLOAD_URL,
      fetchImpl,
    );

    expect(destPath).toBe(path.join(tempDir, "padus.zip"));
    expect(bytes).toBe(zipBytes.byteLength);
    expect(new Uint8Array(await Bun.file(destPath).bytes())).toEqual(zipBytes);
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
  it("wires download, convert, and split, then enqueues a finalize+chunk flow", async () => {
    const zipBytes = await Bun.file(SAMPLE_GDB_ZIP).bytes();
    const fetchImpl = mock(
      async () => new Response(zipBytes, { status: 200 }),
    ) as unknown as typeof fetch;
    const job = makeJob({ initiatedByUserId: userId });

    const result = await ingestPadUs(job, fetchImpl);

    expect(result.chunkCount).toBe(1); // 5 fixture rows, well under ROWS_PER_CHUNK
    expect(result.chunkJobIds.length).toBe(1);

    const run = await db.protectedAreaIngestRun.findFirstOrThrow({
      where: { jobId: "test-job-id" },
      orderBy: { startedAt: "desc" },
    });
    expect(run.initiatedByUserId).toBe(userId);
    expect(run.id).toBe(result.runId);

    // Look jobs up by the id FlowProducer.add() handed back, rather than
    // scanning a queue for jobs currently in some particular state -- if a
    // worker process is already running against this same Redis instance
    // (e.g. `bun run dev:workers`), it can pick these jobs up and move them
    // out of "waiting" well before this assertion runs.
    const chunkJob = (await protectedAreasIngestChunkQueue.getJob(
      result.chunkJobIds[0]!,
    )) as Job<IngestPadUsChunkData> | undefined;
    expect(chunkJob).toBeDefined();
    const chunkContent = await Bun.file(chunkJob!.data.chunkPath).text();
    expect(chunkContent.split("\n")[0]).toBe(CSV_HEADER);
    expect(chunkContent).toContain("Test National Forest");

    const finalizeJob = (await protectedAreasFinalizeIngestQueue.getJob(
      result.finalizeJobId,
    )) as Job<FinalizePadUsIngestData> | undefined;
    expect(finalizeJob).toBeDefined();
    expect(finalizeJob!.data.destDir).toBe(
      path.dirname(chunkJob!.data.chunkPath),
    );

    // Best-effort cleanup -- a concurrently-running worker may have already
    // completed/removed these, or be actively holding a lock on them.
    await Promise.allSettled([chunkJob!.remove(), finalizeJob!.remove()]);
    await fs.promises.rm(finalizeJob!.data.destDir, {
      recursive: true,
      force: true,
    });
  });

  it("records a failed run with an error message when a step throws, and still leaves no temp dir behind", async () => {
    const fetchImpl = mock(
      async () =>
        new Response(null, { status: 500, statusText: "Server Error" }),
    ) as unknown as typeof fetch;
    const job = makeJob();
    const entriesBefore = fs.existsSync(PADUS_TEMP_ROOT)
      ? fs.readdirSync(PADUS_TEMP_ROOT).length
      : 0;

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
    expect(fs.readdirSync(PADUS_TEMP_ROOT).length).toBe(entriesBefore);
  });
});
