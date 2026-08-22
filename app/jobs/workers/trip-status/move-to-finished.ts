import { emailAppUrl } from "$/emails/theme";
import { defineJob } from "$/jobs/define-job";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { sendEmailQueue } from "$/jobs/workers/email/send-email";
import { createNotificationQueue } from "$/jobs/workers/notifications/create-notification";
import { db } from "$/utils/db";

export const TRIPS__MOVE_TO_FINISHED_WORKER = "trips__move_to_finished";

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
        name: true,
        userId: true,
        user: { select: { email: true, name: true } },
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

    // Picked once per trip and reused for both the in-app notification and
    // the email below, so a user with both channels enabled sees/reads the
    // same title rather than two independently randomized ones.
    const notifications = tripsToMove.map((trip) => ({
      trip,
      title: randomFinishedNotificationTitle(),
      description: "We've automatically marked your trip as completed.",
      referenceUrl: `/trips/${trip.id}`,
    }));

    await Promise.all([
      createNotificationQueue.addBulk(
        notifications.map(({ trip, title, description, referenceUrl }) => ({
          name: "trip-moved-to-finished-notification",
          data: {
            userId: trip.userId,
            title,
            description,
            icon: "FlagCheckeredIcon",
            referenceUrl,
            notificationSettingName: "trip_status_update",
          },
        })),
      ),
      sendEmailQueue.addBulk(
        notifications.map(({ trip, title, description, referenceUrl }) => ({
          name: "trip-moved-to-finished-email",
          data: {
            userId: trip.userId,
            to: trip.user.email,
            notificationSettingName: "trip_status_update",
            content: {
              template: "trip-status-update",
              props: {
                userName: trip.user.name,
                title,
                description,
                tripName: trip.name,
                tripUrl: `${emailAppUrl}${referenceUrl}`,
              },
            },
          },
        })),
      ),
    ]);

    if (tripsToMove.length === BATCH_SIZE) {
      await processBatch();
    }
  };

  await processBatch();

  return { changedTripIds, changedCount: changedTripIds.length };
}

const moveToFinishedJob = defineJob({
  name: TRIPS__MOVE_TO_FINISHED_WORKER,
  processor: async () => moveTripsToFinished(),
  defaultJobOptions,
  schedule: { id: "move-to-finished-nightly", pattern: "1 0 * * *" },
});

export const { queue: moveToFinishedQueue, worker: moveToFinishedWorker } =
  moveToFinishedJob;

export default moveToFinishedJob;
