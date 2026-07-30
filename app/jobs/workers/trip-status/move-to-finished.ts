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

export const TRIPS__MOVE_TO_FINISHED_WORKER = "trips__move_to_finished";

const createNotificationQueue = new Queue<CreateNotificationJobData>(
  NOTIFICATIONS__CREATE_NOTIFICATION,
  {
    connection: redisConnection,
  },
);

const BATCH_SIZE = 1000;

export const FINISHED_NOTIFICATION_TITLES = [
  "Trip complete!",
  "Your trip has wrapped up",
  "Welcome back!",
  "That's a wrap on your trip",
  "Trip's all done",
  "Another one in the books",
];

function randomFinishedNotificationTitle() {
  const index = Math.floor(Math.random() * FINISHED_NOTIFICATION_TITLES.length);
  return FINISHED_NOTIFICATION_TITLES[index]!;
}

export async function moveTripsToFinished(now: Date = new Date()) {
  // Runs against jobs that ended yesterday
  now.setUTCDate(now.getUTCDate() - 1);
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
        status: "in_progress",
        end: {
          gte: startOfDayUTC,
          lt: startOfNextDayUTC,
        },
      },
      take: BATCH_SIZE,
    });
    const tripIdsToMove = tripsToMove.map((t) => t.id);

    await db.trip.updateMany({
      where: { id: { in: tripIdsToMove } },
      data: { status: "finished" },
    });

    changedTripIds.push(...tripIdsToMove);

    await createNotificationQueue.addBulk(
      tripsToMove.map(({ id, userId }) => ({
        name: "trip-moved-to-finished-notification",
        data: {
          userId,
          title: randomFinishedNotificationTitle(),
          description: "We've automatically marked your trip as completed.",
          icon: "FlagCheckeredIcon",
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

export const moveToFinishedWorker = new Worker(
  TRIPS__MOVE_TO_FINISHED_WORKER,
  async () => moveTripsToFinished(),
  defaultWorkerOptions,
);
