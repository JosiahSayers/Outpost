import { sendEmailQueue } from "$/jobs/workers/email/send-email";
import type { SendEmailJobData } from "$/jobs/workers/email/send-email";
import { createNotificationQueue } from "$/jobs/workers/notifications/create-notification";
import type { CreateNotificationJobData } from "$/jobs/workers/notifications/create-notification";
import {
  FINISHED_NOTIFICATION_TITLES,
  moveTripsToFinished,
} from "$/jobs/workers/trip-status/move-to-finished";
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

async function emailJobsAddedDuring(fn: () => Promise<unknown>) {
  await fn();
  return (await sendEmailQueue.getJobs(
    NOTIFICATION_JOB_STATES,
  )) as Job<SendEmailJobData>[];
}

describe("moveTripsToFinished", () => {
  it("moves an in_progress trip that ended yesterday to finished", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-14"),
      }),
    });

    const result = await moveTripsToFinished(now);

    expect(result.changedTripIds).toContain(trip.id);
    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("finished");
  });

  it("does not move an in_progress trip that ends today", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-15"),
      }),
    });

    await moveTripsToFinished(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("in_progress");
  });

  it("does not move an in_progress trip that ended two days ago", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-13"),
      }),
    });

    await moveTripsToFinished(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("in_progress");
  });

  it("includes the very start of yesterday's UTC day and excludes the very start of today", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const startOfYesterday = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-14"),
      }),
    });
    const startOfToday = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-15"),
      }),
    });

    const result = await moveTripsToFinished(now);

    expect(result.changedTripIds).toContain(startOfYesterday.id);
    expect(result.changedTripIds).not.toContain(startOfToday.id);
  });

  it("does not move trips with a different status even if they ended yesterday", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "postponed",
        end: new Date("2026-06-14"),
      }),
    });

    await moveTripsToFinished(now);

    const updated = await db.trip.findUnique({ where: { id: trip.id } });
    expect(updated?.status).toBe("postponed");
  });

  it("returns the ids and count of every trip it moved", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trips = await Promise.all([
      db.trip.create({
        data: make("Trip", {
          userId,
          status: "in_progress",
          end: new Date("2026-06-14"),
        }),
      }),
      db.trip.create({
        data: make("Trip", {
          userId,
          status: "in_progress",
          end: new Date("2026-06-14"),
        }),
      }),
    ]);

    const result = await moveTripsToFinished(now);

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
          status: "in_progress",
          end: new Date("2026-06-14"),
        }),
      ),
    });

    const result = await moveTripsToFinished(now);

    expect(result.changedCount).toBe(count);
    const remainingInProgress = await db.trip.count({
      where: {
        status: "in_progress",
        end: {
          gte: new Date("2026-06-14T00:00:00.000Z"),
          lt: new Date("2026-06-15T00:00:00.000Z"),
        },
      },
    });
    expect(remainingInProgress).toBe(0);
  });

  it("enqueues a finished-trip notification for a moved trip", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-14"),
      }),
    });

    const jobs = await notificationJobsAddedDuring(() =>
      moveTripsToFinished(now),
    );

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.name).toBe("trip-moved-to-finished-notification");
    expect(job!.data.userId).toBe(userId);
    expect(job!.data.description).toBe(
      "We've automatically marked your trip as completed.",
    );
    expect(job!.data.icon).toBe("FlagCheckeredIcon");
    expect(job!.data.referenceUrl).toBe(`/trips/${trip.id}`);
    expect(job!.data.notificationSettingName).toBe("trip_status_update");
    expect(FINISHED_NOTIFICATION_TITLES).toContain(job!.data.title);
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
          status: "in_progress",
          end: new Date("2026-06-14"),
        }),
      }),
      db.trip.create({
        data: make("Trip", {
          userId: otherUser.id,
          status: "in_progress",
          end: new Date("2026-06-14"),
        }),
      }),
    ]);

    const jobs = await notificationJobsAddedDuring(() =>
      moveTripsToFinished(now),
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
        status: "in_progress",
        end: new Date("2026-06-15"),
      }),
    });

    const jobs = await notificationJobsAddedDuring(() =>
      moveTripsToFinished(now),
    );

    expect(jobs).toHaveLength(0);
  });

  it("enqueues a finished-trip email for a moved trip", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    const trip = await db.trip.create({
      data: make("Trip", {
        userId,
        name: "Yosemite Backcountry Loop",
        status: "in_progress",
        end: new Date("2026-06-14"),
      }),
    });

    const jobs = await emailJobsAddedDuring(() => moveTripsToFinished(now));

    expect(jobs).toHaveLength(1);
    const [job] = jobs;
    expect(job!.name).toBe("trip-moved-to-finished-email");
    expect(job!.data.userId).toBe(userId);
    expect(job!.data.to).toBe(userEmail);
    expect(job!.data.notificationSettingName).toBe("trip_status_update");
    expect(job!.data.content.template).toBe("trip-status-update");
    const props =
      job!.data.content.template === "trip-status-update"
        ? job!.data.content.props
        : undefined;
    expect(props?.userName).toBe(userName);
    expect(props?.tripName).toBe("Yosemite Backcountry Loop");
    expect(props?.description).toBe(
      "We've automatically marked your trip as completed.",
    );
    expect(props?.tripUrl).toContain(`/trips/${trip.id}`);
    expect(FINISHED_NOTIFICATION_TITLES).toContain(props?.title);
  });

  it("uses the same title for the in-app notification and the email for a given trip", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-14"),
      }),
    });

    await moveTripsToFinished(now);

    const [notificationJobs, emailJobs] = (await Promise.all([
      createNotificationQueue.getJobs(NOTIFICATION_JOB_STATES),
      sendEmailQueue.getJobs(NOTIFICATION_JOB_STATES),
    ])) as [Job<CreateNotificationJobData>[], Job<SendEmailJobData>[]];

    const emailContent = emailJobs[0]?.data.content;
    const emailTitle =
      emailContent?.template === "trip-status-update"
        ? emailContent.props.title
        : undefined;
    expect(notificationJobs[0]?.data.title).toBe(emailTitle);
  });

  it("does not enqueue an email for a trip that isn't moved", async () => {
    const now = new Date("2026-06-15T12:00:00.000Z");
    await db.trip.create({
      data: make("Trip", {
        userId,
        status: "in_progress",
        end: new Date("2026-06-15"),
      }),
    });

    const jobs = await emailJobsAddedDuring(() => moveTripsToFinished(now));

    expect(jobs).toHaveLength(0);
  });
});
