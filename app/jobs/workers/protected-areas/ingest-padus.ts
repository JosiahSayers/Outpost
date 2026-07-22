import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultWorkerOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import { parse } from "csv-parse";
import { Worker, type Job } from "bullmq";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import type { ProtectedAreaCategory } from "../../../../generated/prisma/enums";

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

const BATCH_SIZE = 1000;

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

  await Bun.$`ogr2ogr -f CSV ${csvPath} ${gdbPath} -dialect sqlite -sql ${sql}`;

  return csvPath;
}

interface ProtectedAreaCsvRow {
  sourceUniqueId: string;
  unitName: string;
  localName: string;
  category: string;
  managerType: string;
  managerName: string;
  ownerType: string;
  ownerName: string;
  designationType: string;
  localDesignation: string;
  gapStatus: string;
  iucnCategory: string;
  publicAccess: string;
  dateEstablished: string;
  acres: string;
  aggregatorSource: string;
  wdpaCode: string;
  state: string;
  latitude: string;
  longitude: string;
}

function toNullableString(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toNullableInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableFloat(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function toProtectedAreaData(row: ProtectedAreaCsvRow) {
  return {
    sourceUniqueId: row.sourceUniqueId,
    unitName: row.unitName,
    localName: toNullableString(row.localName),
    category: row.category.toLowerCase() as ProtectedAreaCategory,
    managerType: toNullableString(row.managerType),
    managerName: toNullableString(row.managerName),
    ownerType: toNullableString(row.ownerType),
    ownerName: toNullableString(row.ownerName),
    designationType: toNullableString(row.designationType),
    localDesignation: toNullableString(row.localDesignation),
    gapStatus: toNullableString(row.gapStatus),
    iucnCategory: toNullableString(row.iucnCategory),
    publicAccess: toNullableString(row.publicAccess),
    dateEstablished: toNullableInt(row.dateEstablished),
    acres: toNullableFloat(row.acres),
    aggregatorSource: row.aggregatorSource,
    wdpaCode: toNullableString(row.wdpaCode),
    state: toNullableString(row.state),
    latitude: toNullableFloat(row.latitude),
    longitude: toNullableFloat(row.longitude),
  };
}

async function countDataRows(csvPath: string): Promise<number> {
  let lineCount = 0;
  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity,
  });
  for await (const _line of rl) {
    lineCount++;
  }
  return Math.max(lineCount - 1, 0); // minus header row
}

// Pure Prisma + file logic, no network/GDAL -- the most heavily tested piece.
export async function ingestProtectedAreasCsv(csvPath: string, job: Job) {
  const total = await countDataRows(csvPath);

  let processedCount = 0;
  let createdCount = 0;
  let updatedCount = 0;
  let batch: ProtectedAreaCsvRow[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) return;

    const outcomes = await Promise.all(
      batch.map(async (row) => {
        const data = toProtectedAreaData(row);
        const existing = await db.protectedArea.findUnique({
          where: { sourceUniqueId: data.sourceUniqueId },
          select: { id: true },
        });
        await db.protectedArea.upsert({
          where: { sourceUniqueId: data.sourceUniqueId },
          create: data,
          update: data,
        });
        return existing ? "updated" : "created";
      }),
    );

    processedCount += batch.length;
    createdCount += outcomes.filter((outcome) => outcome === "created").length;
    updatedCount += outcomes.filter((outcome) => outcome === "updated").length;
    await job.updateProgress({ processed: processedCount, total });
    batch = [];
  };

  const parser = fs.createReadStream(csvPath).pipe(parse({ columns: true }));
  for await (const record of parser) {
    batch.push(record as ProtectedAreaCsvRow);
    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }
  await flushBatch();

  return { processedCount, createdCount, updatedCount };
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

  const destDir = fs.mkdtempSync(path.join(os.tmpdir(), "padus-"));

  try {
    const zipPath = await downloadPadUsZip(
      destDir,
      job.data.zipDownloadUrl,
      fetchImpl,
    );
    const csvPath = await convertGdbToCsv(zipPath, destDir);
    const result = await ingestProtectedAreasCsv(csvPath, job);

    await db.protectedAreaIngestRun.update({
      where: { id: run.id },
      data: {
        status: "succeeded",
        finishedAt: new Date(),
        itemsProcessed: result.processedCount,
        itemsCreated: result.createdCount,
        itemsUpdated: result.updatedCount,
      },
    });

    return result;
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
    throw err;
  } finally {
    await fs.promises.rm(destDir, { recursive: true, force: true });
  }
}

export const ingestPadUsWorker = new Worker<IngestPadUsData>(
  PROTECTED_AREAS__INGEST_PADUS_WORKER,
  (job) => ingestPadUs(job),
  defaultWorkerOptions,
);
