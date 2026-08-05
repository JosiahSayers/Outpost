import { createNotificationQueue } from "$/jobs/queues";
import type { CreateNotificationJobData } from "$/jobs/workers/notifications/create-notification";
import {
  NOTIFICATION_TITLE,
  NOTIFICATIONS__NEW_USER_SETTINGS,
  createNewUserSettingsNotifications,
} from "$/jobs/workers/notifications/new-user-settings";
import { db } from "$/utils/db";
import type { Job, JobType } from "bullmq";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { make } from "../../../helpers/test-data/make";

const NOW = new Date("2026-06-15T12:00:00.000Z");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const UNIT_SETTING_SLUGS = [
  "liquid_viewing_unit",
  "liquid_entry_unit",
  "weight_viewing_unit",
  "weight_entry_unit",
] as const;

// The `user` table is excluded from the per-test truncate/restore cycle (see
// integration-preload.ts's AUTH_TABLES) so seeded login sessions keep working
// across a whole suite run -- every user created here has to be deleted by
// hand instead. Notification/AccountSettingValue both cascade on userId, so
// deleting the user is enough.
let createdUserIds: string[] = [];

beforeEach(() => {
  createdUserIds = [];
});

afterEach(async () => {
  if (createdUserIds.length === 0) return;
  await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
});

async function createUser(createdAt: Date) {
  const user = await db.user.create({ data: make("User", { createdAt }) });
  createdUserIds.push(user.id);
  return user;
}

function makeJob(): Job {
  return {
    id: "test-job-id",
    name: NOTIFICATIONS__NEW_USER_SETTINGS,
    data: {},
  } as unknown as Job;
}

// Redis is flushed after every test (see integration-preload.ts), so the
// queue is always empty at the start of a test -- no need to diff or clean up.
const NOTIFICATION_JOB_STATES: JobType[] = [
  "waiting",
  "active",
  "delayed",
  "completed",
  "paused",
  "failed",
];

async function notificationJobsAddedDuring(fn: () => Promise<unknown>) {
  await fn();
  return (await createNotificationQueue.getJobs(
    NOTIFICATION_JOB_STATES,
  )) as Job<CreateNotificationJobData>[];
}

async function givenUnitPreference(userId: string, slug: string) {
  const setting = await db.accountSetting.findFirstOrThrow({
    where: { slug },
  });
  await db.accountSettingValue.create({
    data: make("AccountSettingValue", {
      userId,
      accountSettingId: setting.id,
    }),
  });
}

async function givenExistingNotification(userId: string, title: string) {
  await db.notification.create({
    data: make("Notification", { userId, title }),
  });
}

describe("createNewUserSettingsNotifications", () => {
  describe("the created-in-the-last-day window", () => {
    it("includes a user created at the very start of the window", async () => {
      const user = await createUser(new Date(NOW.getTime() - ONE_DAY_MS));

      const jobs = await notificationJobsAddedDuring(() =>
        createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
      );

      expect(jobs.map((job) => job.data.userId)).toContain(user.id);
    });

    it("excludes a user created just before the window", async () => {
      const user = await createUser(new Date(NOW.getTime() - ONE_DAY_MS - 1));

      const jobs = await notificationJobsAddedDuring(() =>
        createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
      );

      expect(jobs.map((job) => job.data.userId)).not.toContain(user.id);
    });

    it("excludes a user created at or after `now`", async () => {
      const user = await createUser(new Date(NOW));

      const jobs = await notificationJobsAddedDuring(() =>
        createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
      );

      expect(jobs.map((job) => job.data.userId)).not.toContain(user.id);
    });

    it("excludes a user created more than a day ago", async () => {
      const user = await createUser(new Date(NOW.getTime() - 2 * ONE_DAY_MS));

      const jobs = await notificationJobsAddedDuring(() =>
        createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
      );

      expect(jobs.map((job) => job.data.userId)).not.toContain(user.id);
    });
  });

  describe("unit account settings", () => {
    it.each([...UNIT_SETTING_SLUGS])(
      "excludes a user who already has %s set",
      async (slug) => {
        const user = await createUser(new Date(NOW.getTime() - 1000));
        await givenUnitPreference(user.id, slug);

        const jobs = await notificationJobsAddedDuring(() =>
          createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
        );

        expect(jobs.map((job) => job.data.userId)).not.toContain(user.id);
      },
    );

    it("includes a user whose only account setting is unrelated to units", async () => {
      const user = await createUser(new Date(NOW.getTime() - 1000));
      const unrelatedSetting = await db.accountSetting.create({
        data: make("AccountSetting", { slug: "theme" }),
      });
      await db.accountSettingValue.create({
        data: make("AccountSettingValue", {
          userId: user.id,
          accountSettingId: unrelatedSetting.id,
        }),
      });

      const jobs = await notificationJobsAddedDuring(() =>
        createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
      );

      expect(jobs.map((job) => job.data.userId)).toContain(user.id);
    });
  });

  describe("deduping against existing notifications", () => {
    it("excludes a user who already received this notification", async () => {
      const user = await createUser(new Date(NOW.getTime() - 1000));
      await givenExistingNotification(user.id, NOTIFICATION_TITLE);

      const jobs = await notificationJobsAddedDuring(() =>
        createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
      );

      expect(jobs.map((job) => job.data.userId)).not.toContain(user.id);
    });

    it("includes a user whose existing notifications have different titles", async () => {
      const user = await createUser(new Date(NOW.getTime() - 1000));
      await givenExistingNotification(user.id, "Welcome to Outpost");

      const jobs = await notificationJobsAddedDuring(() =>
        createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
      );

      expect(jobs.map((job) => job.data.userId)).toContain(user.id);
    });
  });

  describe("the enqueued notification", () => {
    it("has the expected shape", async () => {
      const user = await createUser(new Date(NOW.getTime() - 1000));

      const jobs = await notificationJobsAddedDuring(() =>
        createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
      );

      const job = jobs.find((j) => j.data.userId === user.id);
      expect(job).toBeDefined();
      expect(job!.name).toBe("new-user-settings-notification");
      expect(job!.data.title).toBe(NOTIFICATION_TITLE);
      expect(job!.data.description).toBe(
        "Click this notification to choose how Outpost displays weights and measures.",
      );
      expect(job!.data.referenceUrl).toBe("/account/preferences");
      expect(job!.data.icon).toBe("RulerIcon");
    });
  });

  describe("the return value", () => {
    it("returns an empty result when no users match", async () => {
      const result = await createNewUserSettingsNotifications(
        makeJob(),
        new Date(NOW),
      );

      expect(result).toEqual({ notifiedUserIds: [], notifiedCount: 0 });
    });

    it("returns the ids and count of every notified user", async () => {
      const users = await Promise.all([
        createUser(new Date(NOW.getTime() - 1000)),
        createUser(new Date(NOW.getTime() - 2000)),
      ]);

      const result = await createNewUserSettingsNotifications(
        makeJob(),
        new Date(NOW),
      );

      expect(result.notifiedCount).toBe(users.length);
      expect(result.notifiedUserIds.sort()).toEqual(
        users.map((user) => user.id).sort(),
      );
    });
  });

  describe("pagination", () => {
    it("notifies every matching user across multiple batches without skipping or duplicating", async () => {
      const count = 130; // bigger than the job's internal batch size
      const createdAt = new Date(NOW.getTime() - 1000);
      const { count: createdCount } = await db.user.createMany({
        data: Array.from({ length: count }, () => make("User", { createdAt })),
      });
      expect(createdCount).toBe(count);
      const createdUsers = await db.user.findMany({
        where: { createdAt },
        select: { id: true },
      });
      createdUserIds.push(...createdUsers.map((user) => user.id));

      const jobs = await notificationJobsAddedDuring(() =>
        createNewUserSettingsNotifications(makeJob(), new Date(NOW)),
      );

      const notifiedUserIds = jobs.map((job) => job.data.userId);
      expect(notifiedUserIds).toHaveLength(count);
      expect(new Set(notifiedUserIds).size).toBe(count);
      expect(notifiedUserIds.sort()).toEqual(
        createdUsers.map((user) => user.id).sort(),
      );
    });
  });
});
