import { emailAppUrl } from "$/emails/theme";
import { defineJob } from "$/jobs/define-job";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { sendEmailQueue } from "$/jobs/workers/email/send-email";
import { createNotificationQueue } from "$/jobs/workers/notifications/create-notification";
import { db } from "$/utils/db";
import { pluralize } from "$/utils/format-helpers/pluralization";

export const MEAL_PLAN__UNPURCHASED_ITEMS_REMINDER_WORKER =
  "meal_plan__unpurchased_items_reminder";

const BATCH_SIZE = 200;

// Fires exactly once, this many days before a trip's start date -- BTP-148
// leaves "single reminder vs. repeat as departure nears" as an open
// question; a single heads-up is the simplest behavior that's clearly
// correct, and doesn't risk emailing someone daily over an unresolved list.
const LEAD_TIME_DAYS = 3;

const PREVIEW_ITEM_COUNT = 3;

function formatTripStartDate(start: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(start);
}

export async function sendUnpurchasedMealPlanItemReminders(
  now: Date = new Date(),
) {
  const target = new Date(now);
  target.setUTCDate(target.getUTCDate() + LEAD_TIME_DAYS);
  const startOfTargetDayUTC = new Date(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      target.getUTCDate(),
    ),
  );
  const startOfNextDayUTC = new Date(
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      target.getUTCDate() + 1,
    ),
  );

  const notifiedTripIds: string[] = [];
  let cursor: string | undefined;

  while (true) {
    // Cursor-paginated rather than re-queried from the front (contrast
    // move-to-in-progress.ts) -- this job never mutates the trips it reads,
    // so unlike a status-changing batch, a page here never removes itself
    // from the next page's filter.
    const trips = await db.trip.findMany({
      select: {
        id: true,
        name: true,
        start: true,
        userId: true,
        user: { select: { email: true, name: true } },
        mealPlanDays: {
          select: {
            items: {
              where: { purchased: false },
              select: { mealPlanItem: { select: { name: true } } },
            },
          },
        },
      },
      where: {
        status: "planning",
        start: { gte: startOfTargetDayUTC, lt: startOfNextDayUTC },
        mealPlanDays: {
          some: {
            items: {
              some: { purchased: false },
            },
          },
        },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    if (trips.length === 0) break;
    cursor = trips.at(-1)!.id;

    // The where clause above already restricts to trips with at least one
    // unpurchased item, so itemNames is guaranteed non-empty here.
    const tripsToNotify = trips.map((trip) => ({
      trip,
      itemNames: trip.mealPlanDays.flatMap((day) =>
        day.items.map((item) => item.mealPlanItem.name),
      ),
    }));

    await Promise.all([
      createNotificationQueue.addBulk(
        tripsToNotify.map(({ trip, itemNames }) => {
          const count = itemNames.length;
          return {
            name: "meal-plan-unpurchased-items-notification",
            data: {
              userId: trip.userId,
              title: "Meal plan shopping reminder",
              description: `You still need to buy ${count} ${pluralize("item", count)} for ${trip.name}, which starts ${formatTripStartDate(trip.start!)}.`,
              icon: "ShoppingCartIcon",
              referenceUrl: `/trips/${trip.id}`,
              notificationSettingName: "meal_plan_unpurchased_items",
            },
          };
        }),
      ),
      sendEmailQueue.addBulk(
        tripsToNotify.map(({ trip, itemNames }) => ({
          name: "meal-plan-unpurchased-items-email",
          data: {
            userId: trip.userId,
            to: trip.user.email,
            notificationSettingName: "meal_plan_unpurchased_items",
            content: {
              template: "meal-plan-reminder",
              props: {
                userName: trip.user.name,
                tripName: trip.name,
                tripStartDate: formatTripStartDate(trip.start!),
                tripUrl: `${emailAppUrl}/trips/${trip.id}`,
                unpurchasedCount: itemNames.length,
                previewItemNames: itemNames.slice(0, PREVIEW_ITEM_COUNT),
                remainingCount: Math.max(
                  itemNames.length - PREVIEW_ITEM_COUNT,
                  0,
                ),
              },
            },
          },
        })),
      ),
    ]);

    notifiedTripIds.push(...tripsToNotify.map(({ trip }) => trip.id));

    if (trips.length < BATCH_SIZE) break;
  }

  return { notifiedTripIds, notifiedCount: notifiedTripIds.length };
}

const unpurchasedItemsReminderJob = defineJob({
  name: MEAL_PLAN__UNPURCHASED_ITEMS_REMINDER_WORKER,
  processor: async () => sendUnpurchasedMealPlanItemReminders(),
  defaultJobOptions,
  schedule: {
    id: "meal-plan-unpurchased-items-reminder-nightly",
    pattern: "1 0 * * *",
  },
});

export const {
  queue: unpurchasedItemsReminderQueue,
  worker: unpurchasedItemsReminderWorker,
} = unpurchasedItemsReminderJob;

export default unpurchasedItemsReminderJob;
