import { sendEmailQueue } from "$/jobs/workers/email/send-email";
import type { SendEmailJobData } from "$/jobs/workers/email/send-email";
import { sendUnpurchasedMealPlanItemReminders } from "$/jobs/workers/meal-plan/unpurchased-items-reminder";
import { createNotificationQueue } from "$/jobs/workers/notifications/create-notification";
import type { CreateNotificationJobData } from "$/jobs/workers/notifications/create-notification";
import { db } from "$/utils/db";
import type { Job, JobType } from "bullmq";
import { beforeEach, describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

let userId: string;
let userEmail: string;
let userName: string | null;

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
  userEmail = user.email;
  userName = user.name;
});

// Redis is flushed after every test (see integration-preload.ts), so the
// queue is always empty at the start of a test -- no need to diff or clean up.
const JOB_STATES: JobType[] = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
];

async function notificationJobsAddedDuring(fn: () => Promise<unknown>) {
  await fn();
  return (await createNotificationQueue.getJobs(
    JOB_STATES,
  )) as Job<CreateNotificationJobData>[];
}

async function emailJobsAddedDuring(fn: () => Promise<unknown>) {
  await fn();
  return (await sendEmailQueue.getJobs(JOB_STATES)) as Job<SendEmailJobData>[];
}

async function createTripWithUnpurchasedItems(
  start: Date,
  itemNames: string[],
  overrides: {
    status?:
      "in_progress" | "planning" | "postponed" | "finished" | "cancelled";
  } = {},
) {
  const trip = await db.trip.create({
    data: make("Trip", {
      userId,
      status: overrides.status ?? "planning",
      start,
    }),
  });
  const day = await db.mealPlanDay.create({
    data: make("MealPlanDay", { tripId: trip.id, dayNumber: 1 }),
  });
  for (const name of itemNames) {
    const item = await db.mealPlanItem.create({
      data: make("MealPlanItem", { userId, name }),
    });
    await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: day.id,
        mealPlanItemId: item.id,
        purchased: false,
      }),
    });
  }
  return trip;
}

describe("sendUnpurchasedMealPlanItemReminders", () => {
  it("notifies for a planning trip starting exactly 3 days out with unpurchased items", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const trip = await createTripWithUnpurchasedItems(new Date("2026-06-04"), [
      "Instant Oatmeal",
    ]);

    const result = await sendUnpurchasedMealPlanItemReminders(now);

    expect(result.notifiedTripIds).toContain(trip.id);
  });

  it("does not notify for a trip starting 2 days out", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const trip = await createTripWithUnpurchasedItems(new Date("2026-06-03"), [
      "Instant Oatmeal",
    ]);

    const result = await sendUnpurchasedMealPlanItemReminders(now);

    expect(result.notifiedTripIds).not.toContain(trip.id);
  });

  it("does not notify for a trip starting 4 days out", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const trip = await createTripWithUnpurchasedItems(new Date("2026-06-05"), [
      "Instant Oatmeal",
    ]);

    const result = await sendUnpurchasedMealPlanItemReminders(now);

    expect(result.notifiedTripIds).not.toContain(trip.id);
  });

  it("does not notify for a trip that isn't in planning status", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const trip = await createTripWithUnpurchasedItems(
      new Date("2026-06-04"),
      ["Instant Oatmeal"],
      { status: "in_progress" },
    );

    const result = await sendUnpurchasedMealPlanItemReminders(now);

    expect(result.notifiedTripIds).not.toContain(trip.id);
  });

  it("does not notify for a trip with no unpurchased items", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-04"),
      }),
    });
    const day = await db.mealPlanDay.create({
      data: make("MealPlanDay", { tripId: trip.id, dayNumber: 1 }),
    });
    const item = await db.mealPlanItem.create({
      data: make("MealPlanItem", { userId }),
    });
    await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: day.id,
        mealPlanItemId: item.id,
        purchased: true,
      }),
    });

    const result = await sendUnpurchasedMealPlanItemReminders(now);

    expect(result.notifiedTripIds).not.toContain(trip.id);
  });

  it("does not notify for a trip with no meal plan at all", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-04"),
      }),
    });

    const result = await sendUnpurchasedMealPlanItemReminders(now);

    expect(result.notifiedTripIds).not.toContain(trip.id);
  });

  it("notifies only the trips with remaining unpurchased items among a mix of fully, partially, and un-purchased trips", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const start = new Date("2026-06-04");

    const fullyPurchasedTrip = await db.trip.create({
      data: make("Trip", {
        userId,
        name: "Fully Purchased",
        status: "planning",
        start,
      }),
    });
    const fullyPurchasedDay = await db.mealPlanDay.create({
      data: make("MealPlanDay", {
        tripId: fullyPurchasedTrip.id,
        dayNumber: 1,
      }),
    });
    const fullyPurchasedItem = await db.mealPlanItem.create({
      data: make("MealPlanItem", { userId, name: "Tent Stakes" }),
    });
    await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: fullyPurchasedDay.id,
        mealPlanItemId: fullyPurchasedItem.id,
        purchased: true,
      }),
    });

    const fullyUnpurchasedTrip = await createTripWithUnpurchasedItems(start, [
      "Instant Oatmeal",
      "Tortillas",
    ]);

    const partiallyPurchasedTrip = await db.trip.create({
      data: make("Trip", {
        userId,
        name: "Partially Purchased",
        status: "planning",
        start,
      }),
    });
    const partiallyPurchasedDay = await db.mealPlanDay.create({
      data: make("MealPlanDay", {
        tripId: partiallyPurchasedTrip.id,
        dayNumber: 1,
      }),
    });
    const purchasedItem = await db.mealPlanItem.create({
      data: make("MealPlanItem", { userId, name: "Trail Mix" }),
    });
    const stillUnpurchasedItem = await db.mealPlanItem.create({
      data: make("MealPlanItem", { userId, name: "Clif Bar" }),
    });
    await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: partiallyPurchasedDay.id,
        mealPlanItemId: purchasedItem.id,
        purchased: true,
      }),
    });
    await db.mealPlanDayItem.create({
      data: make("MealPlanDayItem", {
        mealPlanDayId: partiallyPurchasedDay.id,
        mealPlanItemId: stillUnpurchasedItem.id,
        purchased: false,
      }),
    });

    const result = await sendUnpurchasedMealPlanItemReminders(now);

    expect(result.notifiedTripIds.sort()).toEqual(
      [fullyUnpurchasedTrip.id, partiallyPurchasedTrip.id].sort(),
    );
    expect(result.notifiedTripIds).not.toContain(fullyPurchasedTrip.id);

    const notificationJobs = (await createNotificationQueue.getJobs(
      JOB_STATES,
    )) as Job<CreateNotificationJobData>[];
    expect(notificationJobs).toHaveLength(2);
    expect(notificationJobs.map((job) => job.data.referenceUrl).sort()).toEqual(
      [
        `/trips/${fullyUnpurchasedTrip.id}`,
        `/trips/${partiallyPurchasedTrip.id}`,
      ].sort(),
    );
  });

  it("enqueues an in-app notification with the unpurchased count, icon, and link", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const trip = await createTripWithUnpurchasedItems(new Date("2026-06-04"), [
      "Instant Oatmeal",
      "Tortillas",
    ]);

    const jobs = await notificationJobsAddedDuring(() =>
      sendUnpurchasedMealPlanItemReminders(now),
    );

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.name).toBe("meal-plan-unpurchased-items-notification");
    expect(job!.data.userId).toBe(userId);
    expect(job!.data.title).toBe("Meal plan shopping reminder");
    expect(job!.data.description).toBe(
      `You still need to buy 2 items for ${trip.name}, which starts Thursday, June 4.`,
    );
    expect(job!.data.icon).toBe("ShoppingCartIcon");
    expect(job!.data.referenceUrl).toBe(`/trips/${trip.id}`);
    expect(job!.data.notificationSettingName).toBe(
      "meal_plan_unpurchased_items",
    );
  });

  it("uses singular wording for a single unpurchased item", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const trip = await createTripWithUnpurchasedItems(new Date("2026-06-04"), [
      "Instant Oatmeal",
    ]);

    const jobs = await notificationJobsAddedDuring(() =>
      sendUnpurchasedMealPlanItemReminders(now),
    );

    expect(jobs[0]!.data.description).toBe(
      `You still need to buy 1 item for ${trip.name}, which starts Thursday, June 4.`,
    );
  });

  it("enqueues a meal-plan-reminder email with trip name, start date, and item preview", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const trip = await createTripWithUnpurchasedItems(new Date("2026-06-04"), [
      "Instant Oatmeal",
      "Tortillas",
    ]);

    const jobs = await emailJobsAddedDuring(() =>
      sendUnpurchasedMealPlanItemReminders(now),
    );

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.name).toBe("meal-plan-unpurchased-items-email");
    expect(job!.data.userId).toBe(userId);
    expect(job!.data.to).toBe(userEmail);
    expect(job!.data.notificationSettingName).toBe(
      "meal_plan_unpurchased_items",
    );
    expect(job!.data.content.template).toBe("meal-plan-reminder");
    const props =
      job!.data.content.template === "meal-plan-reminder"
        ? job!.data.content.props
        : undefined;
    expect(props?.userName).toBe(userName);
    expect(props?.tripName).toBe(trip.name);
    expect(props?.tripStartDate).toBe("Thursday, June 4");
    expect(props?.tripUrl).toContain(`/trips/${trip.id}`);
    expect(props?.unpurchasedCount).toBe(2);
    expect(props?.previewItemNames?.sort()).toEqual(
      ["Instant Oatmeal", "Tortillas"].sort(),
    );
    expect(props?.remainingCount).toBe(0);
  });

  it("caps the email preview at 3 item names and reports the rest as remainingCount", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    await createTripWithUnpurchasedItems(new Date("2026-06-04"), [
      "Instant Oatmeal",
      "Tortillas",
      "Trail Mix",
      "Clif Bar",
      "Summer Sausage",
    ]);

    const jobs = await emailJobsAddedDuring(() =>
      sendUnpurchasedMealPlanItemReminders(now),
    );

    const content = jobs[0]!.data.content;
    const props =
      content.template === "meal-plan-reminder" ? content.props : undefined;
    expect(props?.previewItemNames).toHaveLength(3);
    expect(props?.remainingCount).toBe(2);
    expect(props?.unpurchasedCount).toBe(5);
  });

  it("does not enqueue an email or notification for a trip that isn't due", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    await createTripWithUnpurchasedItems(new Date("2026-06-10"), [
      "Instant Oatmeal",
    ]);

    await sendUnpurchasedMealPlanItemReminders(now);

    const [notificationJobs, emailJobs] = (await Promise.all([
      createNotificationQueue.getJobs(JOB_STATES),
      sendEmailQueue.getJobs(JOB_STATES),
    ])) as [Job<CreateNotificationJobData>[], Job<SendEmailJobData>[]];

    expect(notificationJobs).toHaveLength(0);
    expect(emailJobs).toHaveLength(0);
  });

  it("processes every matching trip across multiple pagination pages", async () => {
    const now = new Date("2026-06-01T12:00:00.000Z");
    const start = new Date("2026-06-04");
    const count = 210; // exceeds the job's internal page size of 200

    const tripsData = Array.from({ length: count }, (_, i) =>
      make("Trip", {
        userId,
        name: `Batch trip ${i}`,
        status: "planning",
        start,
      }),
    );
    await db.trip.createMany({ data: tripsData });

    const item = await db.mealPlanItem.create({
      data: make("MealPlanItem", { userId }),
    });
    const daysData = tripsData.map((trip) =>
      make("MealPlanDay", { tripId: trip.id, dayNumber: 1 }),
    );
    await db.mealPlanDay.createMany({ data: daysData });
    await db.mealPlanDayItem.createMany({
      data: daysData.map((day) =>
        make("MealPlanDayItem", {
          mealPlanDayId: day.id,
          mealPlanItemId: item.id,
          purchased: false,
        }),
      ),
    });

    const result = await sendUnpurchasedMealPlanItemReminders(now);

    expect(result.notifiedCount).toBe(count);
    expect(result.notifiedTripIds.sort()).toEqual(
      tripsData.map((trip) => trip.id).sort(),
    );
  });
});
