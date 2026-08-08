import type { JobSchedule } from "$/jobs/define-job";
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

export interface JobGroupMember<DataType, ResultType = unknown> {
  // BullMQ job name within the shared queue, e.g. "peak_refuel". Must be
  // unique within the group -- it's how the dispatching worker below routes
  // a produced job to the right processor.
  name: string;
  processor: Processor<DataType, ResultType>;
  // Per-job retry policy. Queue-level defaultJobOptions apply to every job on
  // a queue regardless of name, so a per-member policy is instead applied via
  // the job template `opts` passed to upsertJobScheduler (see workers/index.ts).
  defaultJobOptions?: DefaultJobOptions;
  schedule?: JobSchedule;
}

export interface DefinedJobGroup<DataType, ResultType = unknown> {
  kind: "job-group";
  name: string; // queue name
  queue: Queue<DataType, ResultType>;
  worker: Worker<DataType, ResultType>;
  members: JobGroupMember<DataType, ResultType>[];
}

// Routes a job to whichever member processor registered under `job.name`.
// Pulled out of defineJobGroup so it's testable directly against a fake job
// object -- no real Queue/Worker/Redis needed, mirroring how this codebase
// tests job processors by calling them directly rather than through a live
// worker (see e.g. moveTripsToFinished).
export function createGroupDispatcher<DataType, ResultType>(
  queueName: string,
  jobs: JobGroupMember<DataType, ResultType>[],
): Processor<DataType, ResultType> {
  const processorsByName = new Map(
    jobs.map((job) => [job.name, job.processor]),
  );

  return (job, ...rest) => {
    const processor = processorsByName.get(job.name);
    if (!processor) {
      throw new Error(
        `No processor registered for job "${job.name}" in queue "${queueName}"`,
      );
    }
    return processor(job, ...rest);
  };
}

// One shared queue, many named jobs -- unlike defineJob (one queue = one
// worker = one processor), this pairs a single worker with a dispatcher that
// routes each job to its registered processor by `job.name`. Intended for a
// family of similar jobs that belong on one queue (e.g. one import job per
// vendor for the public meal catalog) rather than a queue each.
export function defineJobGroup<
  DataType = unknown,
  ResultType = unknown,
>(options: {
  name: string;
  workerOptions?: Partial<Omit<WorkerOptions, "connection" | "autorun">>;
  jobs: JobGroupMember<DataType, ResultType>[];
}): DefinedJobGroup<DataType, ResultType> {
  const { name, workerOptions, jobs } = options;

  const queue = new Queue<DataType, ResultType>(name, {
    connection: redisConnection,
  });

  const worker = new Worker<DataType, ResultType>(
    name,
    createGroupDispatcher(name, jobs),
    {
      ...defaultWorkerOptions,
      ...workerOptions,
      autorun: false,
    },
  );

  return { kind: "job-group", name, queue, worker, members: jobs };
}
