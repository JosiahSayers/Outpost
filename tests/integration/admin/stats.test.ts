import { redisConnection } from "$/jobs/workers/default-options";
import { sendEmailQueue } from "$/jobs/workers/email/send-email";
import { createNotificationQueue } from "$/jobs/workers/notifications/create-notification";
import { getStat } from "$/utils/admin/stats";
import { db } from "$/utils/db";
import type { Queue } from "bullmq";
import { Worker } from "bullmq";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { DateTime, Settings } from "luxon";
import type { User } from "../../../generated/prisma/client";
import { make } from "../../helpers/test-data/make";

// Users/sessions are excluded from the automatic per-test DB reset (see
// tests/preload.ts), so anything created here must be cleaned up manually.
// Deleting a user cascades to its sessions.
let createdUserIds: Array<string>;

beforeEach(() => {
  createdUserIds = [];
});

afterEach(async () => {
  if (createdUserIds.length > 0) {
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
  }
  Settings.now = () => Date.now();
});

async function createUser(overrides = {}): Promise<User> {
  const user = await db.user.create({ data: make("User", overrides) });
  createdUserIds.push(user.id);
  return user;
}

async function createSession(
  userId: string,
  overrides: Partial<{ expiresAt: Date; createdAt: Date }> = {},
) {
  return db.session.create({
    data: {
      id: crypto.randomUUID(),
      token: crypto.randomUUID(),
      userId,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 60_000),
      createdAt: overrides.createdAt ?? new Date(),
      updatedAt: new Date(),
    },
  });
}

// Freezes luxon's notion of "now" to a date far in the future so the
// "created this week" queries can't be polluted by seeded data or other
// tests, which are all created around the real current time. Returns the
// start-of-week boundary the stat functions will use, computed with the
// exact same expression they use internally.
function freezeNow(iso: string): Date {
  const fixed = DateTime.fromISO(iso);
  Settings.now = () => fixed.toMillis();
  return DateTime.now()
    .startOf("day")
    .minus({ days: DateTime.now().weekday % 7 })
    .toJSDate();
}

// Forces `count` jobs on a real queue into the "failed" state so
// getFailedJobs' `queue.getFailedCount()` calls have something to see. Spins
// up a throwaway Worker (the app's own worker for this queue is never
// started in tests -- see define-job.ts) with attempts:1 so each job fails
// on its first try with no retry/backoff delay.
async function failJobs(queue: Queue, count: number) {
  const worker = new Worker(
    queue.name,
    async () => {
      throw new Error("forced failure for test");
    },
    { connection: redisConnection, autorun: false, concurrency: count },
  );

  let remaining = count;
  const allFailed = new Promise<void>((resolve) => {
    worker.on("failed", () => {
      remaining -= 1;
      if (remaining === 0) resolve();
    });
  });

  worker.run();
  await Promise.all(
    Array.from({ length: count }, () =>
      queue.add("test-job", {}, { attempts: 1 }),
    ),
  );
  await allFailed;
  await worker.close();
}

describe("getStat", () => {
  describe("total_users", () => {
    it("returns the total user count", async () => {
      const before = await db.user.count();
      await createUser();
      await createUser();

      const stat = await getStat("total_users");

      expect(stat).toMatchObject({
        stat: "total_users",
        label: "Total Users",
        value: `${before + 2}`,
        sort: 1,
      });
    });

    it("reports an upward trend when users were created this week", async () => {
      const startOfWeek = freezeNow("2030-06-12T12:00:00");
      await createUser({
        createdAt: new Date(startOfWeek.getTime() - 1000),
      });
      await createUser({
        createdAt: new Date(startOfWeek.getTime() + 1000),
      });

      const stat = await getStat("total_users");

      expect(stat.delta).toBe("+1 this week");
      expect(stat.trend).toBe("up");
    });

    it("reports no trend when no users were created this week", async () => {
      const startOfWeek = freezeNow("2030-06-12T12:00:00");
      await createUser({
        createdAt: new Date(startOfWeek.getTime() - 1000),
      });

      const stat = await getStat("total_users");

      expect(stat.delta).toBe("+0 this week");
      expect(stat.trend).toBe(null);
    });
  });

  describe("active_sessions", () => {
    it("counts only non-expired sessions", async () => {
      const before = await db.session.count({
        where: { expiresAt: { gt: new Date() } },
      });
      const user = await createUser();
      await createSession(user.id, {
        expiresAt: new Date(Date.now() + 60_000),
      });
      await createSession(user.id, {
        expiresAt: new Date(Date.now() - 60_000),
      });

      const stat = await getStat("active_sessions");

      expect(stat).toMatchObject({
        stat: "active_sessions",
        label: "Active Sessions",
        value: `${before + 1}`,
        sort: 3,
      });
    });

    it("reports an upward trend for active sessions created this week", async () => {
      const startOfWeek = freezeNow("2030-06-12T12:00:00");
      const user = await createUser();
      await createSession(user.id, {
        createdAt: new Date(startOfWeek.getTime() - 1000),
      });
      await createSession(user.id, {
        createdAt: new Date(startOfWeek.getTime() + 1000),
      });

      const stat = await getStat("active_sessions");

      expect(stat.delta).toBe("+1 this week");
      expect(stat.trend).toBe("up");
    });

    it("reports no trend when no active sessions were created this week", async () => {
      const startOfWeek = freezeNow("2030-06-12T12:00:00");
      const user = await createUser();
      await createSession(user.id, {
        createdAt: new Date(startOfWeek.getTime() - 1000),
      });

      const stat = await getStat("active_sessions");

      expect(stat.delta).toBe("+0 this week");
      expect(stat.trend).toBe(null);
    });
  });

  describe("failed_jobs", () => {
    it("reports an upward trend and a reassuring delta when no jobs have failed", async () => {
      const stat = await getStat("failed_jobs");

      expect(stat).toEqual({
        stat: "failed_jobs",
        label: "Failed Jobs",
        value: "0",
        delta: "Jobs are looking good",
        trend: "up",
        sort: 4,
      });
    });

    it("counts failed jobs on a single queue", async () => {
      await failJobs(createNotificationQueue, 2);

      const stat = await getStat("failed_jobs");

      expect(stat).toEqual({
        stat: "failed_jobs",
        label: "Failed Jobs",
        value: "2",
        delta: "2 jobs need your attention",
        trend: "down",
        sort: 4,
      });
    });

    it("sums failed jobs across every queue in the registry", async () => {
      await failJobs(createNotificationQueue, 1);
      await failJobs(sendEmailQueue, 2);

      const stat = await getStat("failed_jobs");

      expect(stat.value).toBe("3");
      expect(stat.delta).toBe("3 jobs need your attention");
      expect(stat.trend).toBe("down");
    });
  });

  describe("incomplete_meals", () => {
    it("counts meals missing calories, waterMl, dryWeightGrams, or sourceImageUrl", async () => {
      const before = await db.publicMealItem.count({
        where: {
          OR: [
            { dryWeightGrams: null },
            { waterMl: null },
            { calories: null },
            { sourceImageUrl: null },
          ],
        },
      });
      await db.publicMealItem.create({
        data: make("PublicMealItem", {
          calories: 500,
          waterMl: 250,
          dryWeightGrams: 120,
          sourceImageUrl: "https://example.com/meal.png",
        }),
      });
      await db.publicMealItem.create({
        data: make("PublicMealItem", { calories: null }),
      });

      const stat = await getStat("incomplete_meals");

      expect(stat).toEqual({
        stat: "incomplete_meals",
        label: "Incomplete Meals",
        value: `${before + 1}`,
        delta: `${before + 1} meals need your attention`,
        trend: "down",
        sort: 5,
      });
    });

    it("excludes a meal an admin has manually marked ready, even though it's still missing fields", async () => {
      await db.publicMealItem.deleteMany({
        where: {
          OR: [
            { dryWeightGrams: null },
            { waterMl: null },
            { calories: null },
            { sourceImageUrl: null },
          ],
        },
      });
      await db.publicMealItem.create({
        data: make("PublicMealItem", { calories: null, readyOverride: true }),
      });

      const stat = await getStat("incomplete_meals");

      expect(stat).toEqual({
        stat: "incomplete_meals",
        label: "Incomplete Meals",
        value: "0",
        delta: "0 meals need your attention",
        trend: "up",
        sort: 5,
      });
    });

    it("reports an upward trend and a reassuring delta when no meals are incomplete", async () => {
      await db.publicMealItem.deleteMany({
        where: {
          OR: [
            { dryWeightGrams: null },
            { waterMl: null },
            { calories: null },
            { sourceImageUrl: null },
          ],
        },
      });

      const stat = await getStat("incomplete_meals");

      expect(stat).toEqual({
        stat: "incomplete_meals",
        label: "Incomplete Meals",
        value: "0",
        delta: "0 meals need your attention",
        trend: "up",
        sort: 5,
      });
    });
  });
});
