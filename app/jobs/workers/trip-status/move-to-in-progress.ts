import {
  defaultWorkerOptions,
  redisConnection,
} from "$/jobs/workers/default-options";
import {
  NOTIFICATIONS__CREATE_NOTIFICATION,
  type CreateNotificationJobData,
} from "$/jobs/workers/notifications/create-notification";
import { db } from "$/utils/db";
import { Queue, Worker } from "bullmq";

export const TRIPS__MOVE_TO_IN_PROGRESS_WORKER = "trips__move_to_in_progress";

const createNotificationQueue = new Queue<CreateNotificationJobData>(
  NOTIFICATIONS__CREATE_NOTIFICATION,
  {
    connection: redisConnection,
  },
);

const BATCH_SIZE = 1000;

export const IN_PROGRESS_NOTIFICATION_TITLES = [
  "Your trip has started!",
  "Adventure time!",
  "You're on the move",
  "Trip's officially underway",
  "Let the trip begin",
];

function randomInProgressNotificationTitle() {
  const index = Math.floor(
    Math.random() * IN_PROGRESS_NOTIFICATION_TITLES.length,
  );
  return IN_PROGRESS_NOTIFICATION_TITLES[index]!;
}

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
        userId: true,
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

    await createNotificationQueue.addBulk(
      tripsToMove.map(({ id, userId }) => ({
        name: "trip-moved-to-in-progress-notification",
        data: {
          userId,
          title: randomInProgressNotificationTitle(),
          description: "We've automatically marked your trip as in progress.",
          icon: "PersonSimpleHikeIcon",
          referenceUrl: `/trips/${id}`,
        },
      })),
    );

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
