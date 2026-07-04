import type { ConnectionOptions, WorkerOptions } from "bullmq";

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
