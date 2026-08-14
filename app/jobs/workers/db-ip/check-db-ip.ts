import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import { dbIpDownloadQueue } from "$/jobs/workers/db-ip/download-db-ip";
import { DB_IP_JOB_BASE } from "$/jobs/workers/db-ip/shared";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { localCityFile, localCityFileDate } from "$/utils/ip-lookup";
import type { Job } from "bullmq";
import { join } from "node:path";

export const DB_IP_CHECK = `${DB_IP_JOB_BASE}__check_local_file`;

export async function checkDbIp(job: Job) {
  const logger = getLogger(job);
  const { year, month } = localCityFileDate();

  const filepath = join(Bun.env.DB_IP_DIR, localCityFile(year, month));
  const localFile = Bun.file(filepath);

  if (await localFile.exists()) {
    const message = "Current file found, skipping download";
    logger.info(message);
    return message;
  }

  const downloadJob = await dbIpDownloadQueue.add("download-db-ip", {
    year,
    month,
  });

  return `Current local file not found, created download job with id ${downloadJob.id}`;
}

const dbIpCheckJob = defineJob({
  name: DB_IP_CHECK,
  processor: async (job) => checkDbIp(job),
  defaultJobOptions,
});

export const { queue: dbIpCheckQueue, worker: dbIpCheckWorker } = dbIpCheckJob;

export default dbIpCheckJob;
