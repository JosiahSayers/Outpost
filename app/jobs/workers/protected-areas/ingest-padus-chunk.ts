import { getLogger } from "$/jobs/utils/logger-setup";
import { defaultWorkerOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import { parse } from "csv-parse";
import { Worker, type Job } from "bullmq";
import fs from "node:fs";
import readline from "node:readline";
import type { ProtectedAreaCategory } from "../../../../generated/prisma/enums";

export const PROTECTED_AREAS__INGEST_PADUS_CHUNK_WORKER =
  "protected_areas__ingest_padus_chunk";

export interface IngestPadUsChunkData {
  runId: string;
  chunkPath: string;
}

const BATCH_SIZE = 1000;
// Caps concurrent Prisma round trips per flush (findUnique + upsert per row,
// so this is really up to 2x this number of in-flight queries) -- an
// unbounded Promise.all over a full 1000-row batch was hammering Postgres's
// connection pool hard enough to starve the process of CPU/scheduling time
// on resource-constrained boxes, which is what caused BullMQ's lock-renewal
// timer to miss its window and the job to be marked stalled.
const DB_WRITE_CONCURRENCY = 20;

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

    for (let i = 0; i < batch.length; i += DB_WRITE_CONCURRENCY) {
      const slice = batch.slice(i, i + DB_WRITE_CONCURRENCY);
      const outcomes = await Promise.all(
        slice.map(async (row) => {
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
      createdCount += outcomes.filter(
        (outcome) => outcome === "created",
      ).length;
      updatedCount += outcomes.filter(
        (outcome) => outcome === "updated",
      ).length;
    }

    processedCount += batch.length;
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

export async function ingestPadUsChunk(job: Job<IngestPadUsChunkData>) {
  const logger = getLogger(job);
  try {
    return await ingestProtectedAreasCsv(job.data.chunkPath, job);
  } catch (err) {
    logger.error("PAD-US ingest chunk failed", { error: err });
    throw err;
  }
}

export const ingestPadUsChunkWorker = new Worker<IngestPadUsChunkData>(
  PROTECTED_AREAS__INGEST_PADUS_CHUNK_WORKER,
  (job) => ingestPadUsChunk(job),
  { ...defaultWorkerOptions, lockDuration: 10 * 60_000 },
);
