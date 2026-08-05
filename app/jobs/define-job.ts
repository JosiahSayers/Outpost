import {
  defaultWorkerOptions,
  redisConnection,
} from "$/jobs/workers/default-options";
import {
  Queue,
  Worker,
  type DefaultJobOptions,
  type Processor,
  type WorkerOptions,
} from "bullmq";

export interface JobSchedule {
  // schedulerId + repeat pattern, passed straight through to
  // Queue#upsertJobScheduler(id, { pattern }).
  id: string;
  pattern: string;
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
  name: string;
  queue: Queue<DataType, ResultType>;
  worker: Worker<DataType, ResultType>;
  schedule?: JobSchedule;
}

// One call = one queue + one worker, wired to the shared connection, with a
// worker that can never be made to autorun outside workers/index.ts. This is
// the only place `new Queue()` / `new Worker()` should appear under app/jobs
// -- every job file calls this exactly once for its own queue/worker pair.
export function defineJob<DataType = unknown, ResultType = unknown>(
  options: DefineJobOptions<DataType, ResultType>,
): DefinedJob<DataType, ResultType> {
  const { name, processor, workerOptions, defaultJobOptions, schedule } =
    options;

  const queue = new Queue<DataType, ResultType>(name, {
    connection: redisConnection,
    ...(defaultJobOptions ? { defaultJobOptions } : {}),
  });

  const worker = new Worker<DataType, ResultType>(name, processor, {
    ...defaultWorkerOptions,
    ...workerOptions,
    autorun: false,
  });

  return { name, queue, worker, schedule };
}
