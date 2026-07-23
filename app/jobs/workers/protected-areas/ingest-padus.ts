import { getLogger } from "$/jobs/utils/logger-setup";
import {
  defaultWorkerOptions,
  redisConnection,
} from "$/jobs/workers/default-options";
import { PROTECTED_AREAS__FINALIZE_PADUS_INGEST_WORKER } from "$/jobs/workers/protected-areas/finalize-padus-ingest";
import { PROTECTED_AREAS__INGEST_PADUS_CHUNK_WORKER } from "$/jobs/workers/protected-areas/ingest-padus-chunk";
import { db } from "$/utils/db";
import { FlowProducer, Worker, type Job } from "bullmq";
import { parse } from "csv-parse";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";

export const PROTECTED_AREAS__INGEST_PADUS_WORKER =
  "protected_areas__ingest_padus";

export interface IngestPadUsData {
  // USGS gates the PAD-US download page behind a captcha, so there's no
  // automatable source URL: an admin must download the zip by hand, upload
  // it to object storage we control, and supply a presigned/time-limited GET
  // URL here when manually adding the job in Bull Board.
  zipDownloadUrl: string;
  // Optionally set by an admin adding the job manually in Bull Board, since
  // that UI doesn't carry a Better Auth session.
  initiatedByUserId?: string;
}

// Dedicated parent directory (rather than raw os.tmpdir()) so a boot-time
// sweep for orphaned runs (see workers/index.ts) has an unambiguous target
// to clear, instead of guessing at prefixes in a shared temp directory.
export const PADUS_TEMP_ROOT = path.join(os.tmpdir(), "padus-ingest-runs");

const ROWS_PER_CHUNK = 20_000;

const flowProducer = new FlowProducer({ connection: redisConnection });

// Only network-dependent piece. `fetchImpl` defaults to global fetch and is
// overridable per-argument (not mock.module()) so tests can inject a fake
// response instead of hitting real object storage.
export async function downloadPadUsZip(
  destDir: string,
  url: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const response = await fetchImpl(url);
  if (!response.ok || !response.body) {
    throw new Error(
      `Failed to download PAD-US zip: ${response.status} ${response.statusText}`,
    );
  }

  const destPath = path.join(destDir, "padus.zip");
  const fileStream = fs.createWriteStream(destPath);
  await finished(
    Readable.fromWeb(
      response.body as unknown as NodeReadableStream<Uint8Array>,
    ).pipe(fileStream),
  );
  return destPath;
}

async function findGdbDir(dir: string, depth = 0): Promise<string> {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const gdbEntry = entries.find(
    (entry) => entry.isDirectory() && entry.name.endsWith(".gdb"),
  );
  if (gdbEntry) {
    return path.join(dir, gdbEntry.name);
  }

  if (depth < 2) {
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        return await findGdbDir(path.join(dir, entry.name), depth + 1);
      } catch {
        // keep looking in sibling directories
      }
    }
  }

  throw new Error(`No .gdb directory found under ${dir}`);
}

// The PAD-US Combined layer's exact name varies by release (e.g.
// "PADUS4_1Combined"), so find it by name rather than hardcode it.
async function findCombinedLayerName(gdbPath: string): Promise<string> {
  const output = await Bun.$`ogrinfo -so -q ${gdbPath}`.text();
  const layerLine = output.split("\n").find((line) => /combined/i.test(line));
  if (!layerLine) {
    throw new Error(
      `No layer containing "Combined" found in ${gdbPath}. ogrinfo output:\n${output}`,
    );
  }

  const match = layerLine.match(/^Layer:\s*(.+?)\s*\(/);
  return (match?.[1] ?? layerLine.replace(/^Layer:\s*/, "")).trim();
}

// Column names confirmed with `ogrinfo -al -so <gdb> <combined-layer>` against
// a real downloaded PAD-US 4.1 extract. Notes from that verification:
// - There is no "Unit_ID" field. `OBJECTID` (the GDB's own FID) is used for
//   `sourceUniqueId` instead -- PAD-US has no field that's both populated and
//   unique across every row (`Source_PAID` is blank on ~36% of rows and only
//   ~55% unique on the rest). OBJECTID is unique within a given export but
//   not guaranteed stable across a future PAD-US release (see the schema
//   comment on `ProtectedArea.sourceUniqueId`).
// - The layer's native CRS is USA_Contiguous_Albers_Equal_Area_Conic (meters),
//   not WGS84, so the centroid is computed in that equal-area CRS (the
//   correct way to compute a centroid, and PAD-US's own intended CRS for
//   exactly this) and only the resulting point is transformed to EPSG:4326
//   -- transforming ~657k complex multi-polygons instead would be far slower
//   for no benefit.
// - "SHAPE" is the standard ESRI File Geodatabase geometry column name.
const PADUS_SELECT_COLUMNS = `
  OBJECTID AS "sourceUniqueId",
  "Unit_Nm" AS "unitName",
  "Loc_Nm" AS "localName",
  "Category" AS "category",
  "Mang_Type" AS "managerType",
  "Mang_Name" AS "managerName",
  "Own_Type" AS "ownerType",
  "Own_Name" AS "ownerName",
  "Des_Tp" AS "designationType",
  "Loc_Ds" AS "localDesignation",
  "GAP_Sts" AS "gapStatus",
  "IUCN_Cat" AS "iucnCategory",
  "Pub_Access" AS "publicAccess",
  "Date_Est" AS "dateEstablished",
  "GIS_Acres" AS "acres",
  "Agg_Src" AS "aggregatorSource",
  "WDPA_Cd" AS "wdpaCode",
  "State_Nm" AS "state",
  ST_X(ST_Transform(ST_Centroid(SHAPE), 4326)) AS "longitude",
  ST_Y(ST_Transform(ST_Centroid(SHAPE), 4326)) AS "latitude"
`.trim();

// Only GDAL-dependent piece. Real ogr2ogr call, no network -- testable in CI
// against a small checked-in fixture zip (see tests/fixtures). Geometry never
// reaches Node/Postgres: GDAL computes the centroid and everything else is
// discarded by the CSV writer.
export async function convertGdbToCsv(
  zipPath: string,
  destDir: string,
): Promise<string> {
  const extractedDir = path.join(destDir, "extracted");
  await fs.promises.mkdir(extractedDir, { recursive: true });
  await Bun.$`unzip -q ${zipPath} -d ${extractedDir}`;

  const gdbPath = await findGdbDir(extractedDir);
  const layerName = await findCombinedLayerName(gdbPath);
  const csvPath = path.join(destDir, "padus.csv");
  const sql = `SELECT ${PADUS_SELECT_COLUMNS} FROM "${layerName}"`;

  // We only ever keep the centroid (see PADUS_SELECT_COLUMNS) and discard
  // the rest of the geometry, so GDAL's full shell/hole ring-classification
  // pass (organizePolygons) is wasted work here -- it's also slow enough on
  // PAD-US's many-part polygons (e.g. national forest boundaries made of
  // hundreds of disjoint parcels) to log its own "may be really slow"
  // warning. SKIP treats every ring as a top-level polygon instead of
  // classifying holes, which can shift a centroid slightly for complex
  // multi-part polygons but is immaterial for a representative map point.
  await Bun.$`ogr2ogr --config OGR_ORGANIZE_POLYGONS SKIP -f CSV ${csvPath} ${gdbPath} -dialect sqlite -sql ${sql}`;

  return csvPath;
}

// PAD-US text fields (unit/local names, designations) can contain commas or
// embedded newlines, which ogr2ogr quotes per RFC 4180. Re-quote on write so
// a value round-trips exactly through parse -> split -> re-parse.
function csvField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function csvRow(fields: string[]): string {
  return fields.map(csvField).join(",");
}

// Splits the converted CSV into fixed-size row chunks (each carrying its own
// header line) so ingestion can run as many small, independently-retryable
// BullMQ jobs instead of one job that has to process all ~657k rows in a
// single pass. Folds in the row count so a separate full-file count pass
// (like the old countDataRows) isn't needed here.
//
// Parses real CSV records (via csv-parse) rather than splitting on raw
// physical lines: a quoted field can itself contain a newline, so a
// naive readline-based split can cut a chunk boundary in the middle of a
// field and produce two corrupt chunk files (seen in practice -- "Quote Not
// Closed" / "Invalid Closing Quote" errors from csv-parse on the resulting
// chunks).
export async function splitCsvIntoChunks(
  csvPath: string,
  destDir: string,
  rowsPerChunk: number,
): Promise<{ chunkPaths: string[]; totalRows: number }> {
  const parser = fs.createReadStream(csvPath).pipe(parse({ columns: false }));

  let header: string[] | null = null;
  let totalRows = 0;
  let chunkIndex = 0;
  let rowsInCurrentChunk = 0;
  const current: { stream: fs.WriteStream | null } = { stream: null };
  const chunkPaths: string[] = [];
  const pendingWrites: Promise<void>[] = [];

  const openNextChunk = () => {
    current.stream?.end();
    const chunkPath = path.join(
      destDir,
      `chunk-${String(chunkIndex).padStart(5, "0")}.csv`,
    );
    chunkPaths.push(chunkPath);
    current.stream = fs.createWriteStream(chunkPath);
    pendingWrites.push(finished(current.stream));
    current.stream.write(`${csvRow(header!)}\n`);
    chunkIndex++;
    rowsInCurrentChunk = 0;
  };

  for await (const record of parser) {
    if (header === null) {
      header = record as string[];
      continue;
    }
    if (!current.stream || rowsInCurrentChunk >= rowsPerChunk) {
      openNextChunk();
    }
    current.stream!.write(`${csvRow(record as string[])}\n`);
    rowsInCurrentChunk++;
    totalRows++;
  }
  current.stream?.end();

  await Promise.all(pendingWrites);
  return { chunkPaths, totalRows };
}

export async function ingestPadUs(
  job: Job<IngestPadUsData>,
  fetchImpl: typeof fetch = fetch,
) {
  const logger = getLogger(job);
  const run = await db.protectedAreaIngestRun.create({
    data: {
      source: "PAD-US 4.1 Combined",
      jobId: job.id,
      initiatedByUserId: job.data.initiatedByUserId,
    },
  });

  await fs.promises.mkdir(PADUS_TEMP_ROOT, { recursive: true });
  const destDir = fs.mkdtempSync(path.join(PADUS_TEMP_ROOT, `run-`));

  try {
    const zipPath = await downloadPadUsZip(
      destDir,
      job.data.zipDownloadUrl,
      fetchImpl,
    );
    const csvPath = await convertGdbToCsv(zipPath, destDir);
    const { chunkPaths } = await splitCsvIntoChunks(
      csvPath,
      destDir,
      ROWS_PER_CHUNK,
    );

    const flow = await flowProducer.add({
      name: "finalize-padus-ingest",
      queueName: PROTECTED_AREAS__FINALIZE_PADUS_INGEST_WORKER,
      data: { runId: run.id, destDir },
      children: chunkPaths.map((chunkPath) => ({
        name: "ingest-padus-chunk",
        queueName: PROTECTED_AREAS__INGEST_PADUS_CHUNK_WORKER,
        data: { runId: run.id, chunkPath },
        opts: {
          ignoreDependencyOnFailure: true,
          attempts: 3,
          backoff: { type: "exponential" as const, delay: 5000 },
        },
      })),
    });

    return {
      runId: run.id,
      chunkCount: chunkPaths.length,
      // Job ids of the flow just created -- lets callers (and tests) look a
      // specific job up by id via Queue#getJob() regardless of what state
      // it's since moved to, rather than scanning a queue's current state
      // (which races against any worker process already consuming it).
      finalizeJobId: flow.job.id!,
      chunkJobIds: (flow.children ?? []).map((child) => child.job.id!),
    };
  } catch (err) {
    logger.error("PAD-US ingest failed", { error: err });
    await db.protectedAreaIngestRun.update({
      where: { id: run.id },
      data: {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: String(err),
      },
    });
    await fs.promises.rm(destDir, { recursive: true, force: true });
    throw err;
  }
}

export const ingestPadUsWorker = new Worker<IngestPadUsData>(
  PROTECTED_AREAS__INGEST_PADUS_WORKER,
  (job) => ingestPadUs(job),
  { ...defaultWorkerOptions, lockDuration: 10 * 60_000 },
);
