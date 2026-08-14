import type { DefinedJob } from "$/jobs/define-job";
import type { DefinedJobGroup } from "$/jobs/define-job-group";
import dbIpCheckJob from "$/jobs/workers/db-ip/check-db-ip";
import dbIpDownloadJob from "$/jobs/workers/db-ip/download-db-ip";
import sendPasswordChangedEmailJob from "$/jobs/workers/email/password-changed";
import sendResetPasswordEmailJob from "$/jobs/workers/email/reset-password";
import sendVerifyEmailJob from "$/jobs/workers/email/verify-email";
import inferMetadataJob from "$/jobs/workers/feedback/infer-metadata";
import createNotificationJob from "$/jobs/workers/notifications/create-notification";
import newUserSettingsNotificationsJob from "$/jobs/workers/notifications/new-user-settings";
import deriveCanonicalEntitiesJob from "$/jobs/workers/protected-areas/derive-canonical-entities";
import finalizePadUsIngestJob from "$/jobs/workers/protected-areas/finalize-padus-ingest";
import ingestPadUsJob from "$/jobs/workers/protected-areas/ingest-padus";
import ingestPadUsChunkJob from "$/jobs/workers/protected-areas/ingest-padus-chunk";
import { publicMealCatalogImportGroup } from "$/jobs/workers/public-meal-catalog/registry";
import moveToFinishedJob from "$/jobs/workers/trip-status/move-to-finished";
import moveToInProgressJob from "$/jobs/workers/trip-status/move-to-in-progress";

// The one place a new job (or job group -- see define-job-group.ts) gets
// wired into Bull Board and the worker process's run/schedule loop. Add one
// import + one array entry here; nothing else in this file, workers/index.ts,
// or bull-board.ts needs to change.
export const registry: (DefinedJob<any, any> | DefinedJobGroup<any, any>)[] = [
  createNotificationJob,
  moveToInProgressJob,
  moveToFinishedJob,
  sendResetPasswordEmailJob,
  sendPasswordChangedEmailJob,
  sendVerifyEmailJob,
  ingestPadUsJob,
  ingestPadUsChunkJob,
  finalizePadUsIngestJob,
  deriveCanonicalEntitiesJob,
  newUserSettingsNotificationsJob,
  inferMetadataJob,
  publicMealCatalogImportGroup,
  dbIpCheckJob,
  dbIpDownloadJob,
];
