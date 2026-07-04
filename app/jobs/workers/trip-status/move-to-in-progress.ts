import { defaultWorkerOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";
import { Worker } from "bullmq";

export const TRIPS__MOVE_TO_IN_PROGRESS_WORKER = "trips__move_to_in_progress";

const BATCH_SIZE = 1000;

export async function moveTripsToInProgress(now: Date = new Date()) {
  const startOfDayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startOfNextDayUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  const changedTripIds: string[] = [];

  const processBatch = async () => {
    // Each batch is re-queried from the front rather than paginated with
    // `skip`, since updating a batch removes it from the `planning` filter
    // and would otherwise cause the next page to skip over unprocessed rows.
    const tripsToMove = await db.trip.findMany({
      select: {
        id: true,
      },
      where: {
        status: "planning",
        start: {
          gte: startOfDayUTC,
          lt: startOfNextDayUTC,
        },
      },
      take: BATCH_SIZE,
    });
    const tripIdsToMove = tripsToMove.map((t) => t.id);

    await db.trip.updateMany({
      where: { id: { in: tripIdsToMove } },
      data: { status: "in_progress" },
    });

    changedTripIds.push(...tripIdsToMove);

    if (tripsToMove.length === BATCH_SIZE) {
      await processBatch();
    }
  };

  await processBatch();

  return { changedTripIds, changedCount: changedTripIds.length };
}

export const moveToInProgressWorker = new Worker(
  TRIPS__MOVE_TO_IN_PROGRESS_WORKER,
  async () => moveTripsToInProgress(),
  defaultWorkerOptions,
);
