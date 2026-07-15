import { jobLogger } from "$/utils/logger";
import type { Job } from "bullmq";

export const getLogger = (job: Job) => {
  const logger = jobLogger.child({});
  logger.defaultMeta = {
    ...jobLogger.defaultMeta,
    job: { name: job.name, data: job.data, id: job.id },
  };

  return logger;
};
