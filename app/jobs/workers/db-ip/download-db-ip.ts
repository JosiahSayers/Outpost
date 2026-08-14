import { defineJob } from "$/jobs/define-job";
import { getLogger } from "$/jobs/utils/logger-setup";
import {
  DB_IP_JOB_BASE,
  downloadUrl,
  localCityFile,
} from "$/jobs/workers/db-ip/shared";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { timer } from "$/utils/performance";
import type { Job } from "bullmq";
import maxmind from "maxmind";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

export const DB_IP_DOWNLOAD = `${DB_IP_JOB_BASE}__download`;

export interface DownloadDbIpData {
  year: string | number;
  month: string | number;
}

export const reportProgress = (job: Job, additions: Record<any, any>) => {
  const currentProgress = typeof job.progress === "object" ? job.progress : {};
  job.updateProgress({
    ...currentProgress,
    ...additions,
  });
};

export async function downloadDbIp(
  job: Job<DownloadDbIpData>,
  fetchImpl: typeof fetch = fetch,
) {
  const logger = getLogger(job);
  const { time: downloadTime, value: download } = await timer(() =>
    fetchImpl(downloadUrl(job.data.year, job.data.month)),
  );
  reportProgress(job, {
    downloadTime,
  });

  const { time: decompressionTime, value: decompressed } = await timer(
    async () => Bun.gunzipSync(await download.bytes()),
  );
  reportProgress(job, {
    decompressionTime,
  });

  const filename = localCityFile(job.data.year, job.data.month);
  const filepath = join(Bun.env.DB_IP_DIR, filename);
  const { time: writeTime } = await timer(() =>
    Bun.write(filepath, decompressed),
  );
  reportProgress(job, {
    writeTime,
  });

  const { time: verificationTime, value: cloudflare } = await timer(
    async () => {
      const lookup = await maxmind.open(filepath);
      const cloudflare = lookup.get("1.1.1.1");
      return cloudflare;
    },
  );
  reportProgress(job, {
    verificationTime,
    verificationPassed: !!cloudflare,
  });

  if (!cloudflare) {
    const message = "Failed to download and verify new db-ip file";
    logger.error(message);
    await Bun.file(filepath).delete();
    throw new Error(message);
  }

  // clean up old files
  const { time: cleanupTime, value: allOtherFiles } = await timer(async () => {
    const allFiles = await readdir(Bun.env.DB_IP_DIR);
    const allOtherFiles = allFiles.filter((file) => file !== filename);
    for (const file of allOtherFiles) {
      await Bun.file(join(Bun.env.DB_IP_DIR, file)).delete();
    }
    return allOtherFiles;
  });

  reportProgress(job, { cleanupTime });

  return {
    newFile: filepath,
    cleanedFiles: allOtherFiles,
  };
}

const dbIpDownloadJob = defineJob<DownloadDbIpData>({
  name: DB_IP_DOWNLOAD,
  processor: async (job) => downloadDbIp(job),
  defaultJobOptions,
});

export const { queue: dbIpDownloadQueue, worker: dbIpDownloadWorker } =
  dbIpDownloadJob;

export default dbIpDownloadJob;
