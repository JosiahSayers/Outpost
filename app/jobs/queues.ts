import {
  defaultJobOptions,
  redisConnection,
} from "$/jobs/workers/default-options";
import {
  EMAILS__RESET_PASSWORD_WORKER,
  type SendResetPasswordEmailData,
} from "$/jobs/workers/email/reset-password";
import { PROTECTED_AREAS__FINALIZE_PADUS_INGEST_WORKER } from "$/jobs/workers/protected-areas/finalize-padus-ingest";
import {
  PROTECTED_AREAS__INGEST_PADUS_CHUNK_WORKER,
  type IngestPadUsChunkData,
} from "$/jobs/workers/protected-areas/ingest-padus-chunk";
import {
  PROTECTED_AREAS__INGEST_PADUS_WORKER,
  type IngestPadUsData,
} from "$/jobs/workers/protected-areas/ingest-padus";
import { TRIPS__MOVE_TO_FINISHED_WORKER } from "$/jobs/workers/trip-status/move-to-finished";
import { TRIPS__MOVE_TO_IN_PROGRESS_WORKER } from "$/jobs/workers/trip-status/move-to-in-progress";
import { Queue } from "bullmq";

export const moveToInProgressQueue = new Queue(
  TRIPS__MOVE_TO_IN_PROGRESS_WORKER,
  { connection: redisConnection, defaultJobOptions },
);

export const moveToFinishedQueue = new Queue(TRIPS__MOVE_TO_FINISHED_WORKER, {
  connection: redisConnection,
  defaultJobOptions,
});

export const sendResetPasswordEmailQueue =
  new Queue<SendResetPasswordEmailData>(EMAILS__RESET_PASSWORD_WORKER, {
    connection: redisConnection,
    defaultJobOptions,
  });

export const protectedAreasIngestQueue = new Queue<IngestPadUsData>(
  PROTECTED_AREAS__INGEST_PADUS_WORKER,
  { connection: redisConnection, defaultJobOptions: { attempts: 1 } }, // override shared default -- no auto-retry
);

export const protectedAreasIngestChunkQueue = new Queue<IngestPadUsChunkData>(
  PROTECTED_AREAS__INGEST_PADUS_CHUNK_WORKER,
  { connection: redisConnection },
);

export const protectedAreasFinalizeIngestQueue = new Queue(
  PROTECTED_AREAS__FINALIZE_PADUS_INGEST_WORKER,
  { connection: redisConnection },
);

export const allQueues = [
  moveToInProgressQueue,
  moveToFinishedQueue,
  sendResetPasswordEmailQueue,
  protectedAreasIngestQueue,
  protectedAreasIngestChunkQueue,
  protectedAreasFinalizeIngestQueue,
];
