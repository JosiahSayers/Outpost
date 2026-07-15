import type {
  ConnectionOptions,
  DefaultJobOptions,
  WorkerOptions,
} from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6379");

export const redisConnection: ConnectionOptions = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
};

export const defaultWorkerOptions: WorkerOptions = {
  connection: redisConnection,
  autorun: false,
  concurrency: 5,
};

export const defaultJobOptions: DefaultJobOptions = {
  attempts: 5,
  backoff: {
    type: "exponential",
    delay: 5000,
  },
};
