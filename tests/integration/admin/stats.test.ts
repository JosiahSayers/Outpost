import { getStat } from "$/utils/admin/stats";
import { db } from "$/utils/db";
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

  describe("banned_users", () => {
    it("counts only banned users", async () => {
      const before = await db.user.count({ where: { banned: true } });
      await createUser({ banned: true });
      await createUser({ banned: false });

      const stat = await getStat("banned_users");

      expect(stat).toEqual({
        stat: "banned_users",
        label: "Banned Users",
        value: `${before + 1}`,
        delta: null,
        trend: null,
        sort: 2,
      });
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
    it("returns a placeholder stat", async () => {
      const stat = await getStat("failed_jobs");

      expect(stat).toEqual({
        stat: "failed_jobs",
        label: "Failed Jobs",
        value: "0",
        delta: null,
        trend: null,
        sort: 4,
      });
    });
  });
});
