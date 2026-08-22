import {
  defaultWorkerOptions,
  redisConnection,
} from "$/jobs/workers/default-options";
import * as Sentry from "@sentry/bun";
import {
  Queue,
  Worker,
  type DefaultJobOptions,
  type Processor,
  type WorkerOptions,
} from "bullmq";

export interface JobSchedule {
  // schedulerId + repeat pattern, passed straight through to
  // Queue#upsertJobScheduler(id, { pattern, tz }).
  id: string;
  pattern: string;
  // IANA tz name (e.g. "America/New_York") the pattern is evaluated in.
  // Omitted means UTC. BullMQ/cron-parser handle DST for named zones, so
  // e.g. a fixed "3am Eastern" schedule doesn't drift across the DST switch.
  tz?: string;
}

export interface DefineJobOptions<DataType, ResultType = unknown> {
  name: string;
  processor: Processor<DataType, ResultType>;
  // connection/autorun are owned by defineJob and can't be overridden here --
  // only the worker process (workers/index.ts) is allowed to call .run().
  workerOptions?: Partial<Omit<WorkerOptions, "connection" | "autorun">>;
  // Left unset on purpose rather than defaulting to the shared retry policy --
  // pass defaultJobOptions from "$/jobs/workers/default-options" explicitly
  // for jobs that want the shared 5-attempt/exponential-backoff policy, or a
  // custom value for jobs that intentionally deviate from it.
  defaultJobOptions?: DefaultJobOptions;
  // Present only for jobs workers/index.ts should upsertJobScheduler for at boot.
  schedule?: JobSchedule;
}

export interface DefinedJob<DataType, ResultType = unknown> {
  // Discriminates against DefinedJobGroup (define-job-group.ts) so shared
  // consumers (registry.ts, workers/index.ts) can branch on shape. Existing
  // job files are unaffected -- none of them read `.kind`.
  kind: "job";
  name: string;
  queue: Queue<DataType, ResultType>;
  worker: Worker<DataType, ResultType>;
  schedule?: JobSchedule;
}

// One call = one queue + one worker, wired to the shared connection, with a
// worker that can never be made to autorun outside workers/index.ts. This is
// the only place `new Queue()` / `new Worker()` should appear under app/jobs
// -- every job file calls this exactly once for its own queue/worker pair.
// For a queue meant to hold several distinct job types (e.g. one importer
// job per vendor sharing a queue), see defineJobGroup in define-job-group.ts
// instead.
export function defineJob<DataType = unknown, ResultType = unknown>(
  options: DefineJobOptions<DataType, ResultType>,
): DefinedJob<DataType, ResultType> {
  const { name, processor, workerOptions, defaultJobOptions, schedule } =
    options;

  const queue = new Queue<DataType, ResultType>(name, {
    connection: redisConnection,
    ...(defaultJobOptions ? { defaultJobOptions } : {}),
  });

  // Sentry Crons check-in for scheduled jobs -- surfaces both failures and
  // missed/silent runs for this schedule, not just errors that happen to
  // throw loudly.
  const monitoredProcessor: Processor<DataType, ResultType> = schedule
    ? (job, ...rest) =>
        Sentry.withMonitor(schedule.id, () => processor(job, ...rest), {
          schedule: { type: "crontab", value: schedule.pattern },
          timezone: schedule.tz,
        })
    : processor;

  const worker = new Worker<DataType, ResultType>(name, monitoredProcessor, {
    ...defaultWorkerOptions,
    ...workerOptions,
    autorun: false,
  });

  return { kind: "job", name, queue, worker, schedule };
}
