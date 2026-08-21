import { createNotificationQueue } from "$/jobs/workers/notifications/create-notification";
import type { CreateNotificationJobData } from "$/jobs/workers/notifications/create-notification";
import {
  IN_PROGRESS_NOTIFICATION_TITLES,
  moveTripsToInProgress,
} from "$/jobs/workers/trip-status/move-to-in-progress";
import { db } from "$/utils/db";
import type { Job, JobType } from "bullmq";
import { beforeEach, describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

let userId: string;

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

// Redis is flushed after every test (see integration-preload.ts), so the
// queue is always empty at the start of a test -- no need to diff or clean up.
const NOTIFICATION_JOB_STATES: JobType[] = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
];

async function notificationJobsAddedDuring(fn: () => Promise<unknown>) {
  await fn();
  return (await createNotificationQueue.getJobs(
    NOTIFICATION_JOB_STATES,
  )) as Job<CreateNotificationJobData>[];
}

describe("moveTripsToInProgress", () => {
  it("moves a planning trip that starts today to in_progress", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-15"),
      }),
    });

    const result = await moveTripsToInProgress(now);

    expect(result.changedTripIds).toContain(trip.id);
    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("in_progress");
  });

  it("does not move a planning trip that starts yesterday", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-14"),
      }),
    });

    await moveTripsToInProgress(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("planning");
  });

  it("does not move a planning trip that starts tomorrow", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-16"),
      }),
    });

    await moveTripsToInProgress(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("planning");
  });

  it("includes the very start of the UTC day and excludes the very start of the next day", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const startOfDay = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-15"),
      }),
    });
    const startOfNextDay = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-16"),
      }),
    });

    const result = await moveTripsToInProgress(now);

    expect(result.changedTripIds).toContain(startOfDay.id);
    expect(result.changedTripIds).not.toContain(startOfNextDay.id);
  });

  it("does not move trips with a different status even if they start today", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "postponed",
        start: new Date("2026-06-15"),
      }),
    });

    await moveTripsToInProgress(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("postponed");
  });

  it("returns the ids and count of every trip it moved", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trips = await Promise.all([
      db.trip.create({
        data: make("Trip", {
          userId,
          status: "planning",
          start: new Date("2026-06-15"),
        }),
      }),
      db.trip.create({
        data: make("Trip", {
          userId,
          status: "planning",
          start: new Date("2026-06-15"),
        }),
      }),
    ]);

    const result = await moveTripsToInProgress(now);

    expect(result.changedCount).toBe(trips.length);
    expect(result.changedTripIds.sort()).toEqual(
      trips.map((trip) => trip.id).sort(),
    );
  });

  it("moves every matching trip across multiple batches", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const count = 1200;
    await db.trip.createMany({
      data: Array.from({ length: count }, (_, i) =>
        make("Trip", {
          userId,
          name: `Batch trip ${i}`,
          status: "planning",
          start: new Date("2026-06-15"),
        }),
      ),
    });

    const result = await moveTripsToInProgress(now);

    expect(result.changedCount).toBe(count);
    const remainingPlanning = await db.trip.count({
      where: {
        status: "planning",
        start: {
          gte: new Date("2026-06-15T00:00:00.000Z"),
          lt: new Date("2026-06-16T00:00:00.000Z"),
        },
      },
    });
    expect(remainingPlanning).toBe(0);
  });

  it("enqueues an in-progress-trip notification for a moved trip", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-15"),
      }),
    });

    const jobs = await notificationJobsAddedDuring(() =>
      moveTripsToInProgress(now),
    );

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.name).toBe("trip-moved-to-in-progress-notification");
    expect(job!.data.userId).toBe(userId);
    expect(job!.data.description).toBe(
      "We've automatically marked your trip as in progress.",
    );
    expect(job!.data.icon).toBe("PersonSimpleHikeIcon");
    expect(job!.data.referenceUrl).toBe(`/trips/${trip.id}`);
    expect(job!.data.notificationSettingName).toBe("trip_status_update");
    expect(IN_PROGRESS_NOTIFICATION_TITLES).toContain(job!.data.title);
  });

  it("enqueues one notification per moved trip, addressed to that trip's owner", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const otherUser = await db.user.findUniqueOrThrow({
      where: { email: "user2@test.com" },
    });
    const [trip, otherTrip] = await Promise.all([
      db.trip.create({
        data: make("Trip", {
          userId,
          status: "planning",
          start: new Date("2026-06-15"),
        }),
      }),
      db.trip.create({
        data: make("Trip", {
          userId: otherUser.id,
          status: "planning",
          start: new Date("2026-06-15"),
        }),
      }),
    ]);

    const jobs = await notificationJobsAddedDuring(() =>
      moveTripsToInProgress(now),
    );

    expect(jobs).toHaveLength(2);
    expect(jobs.map((job) => job.data.userId).sort()).toEqual(
      [userId, otherUser.id].sort(),
    );
    expect(jobs.map((job) => job.data.referenceUrl).sort()).toEqual(
      [`/trips/${trip.id}`, `/trips/${otherTrip.id}`].sort(),
    );
  });

  it("does not enqueue a notification for a trip that isn't moved", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    await db.trip.create({
      data: make("Trip", {
        userId,
        status: "planning",
        start: new Date("2026-06-16"),
      }),
    });

    const jobs = await notificationJobsAddedDuring(() =>
      moveTripsToInProgress(now),
    );

    expect(jobs).toHaveLength(0);
  });
});
