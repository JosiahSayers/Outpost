import { pruneStalePushSubscriptions } from "$/jobs/workers/notifications/prune-stale-push-subscriptions";
import { db } from "$/utils/db";
import { beforeEach, describe, expect, it } from "bun:test";

const NOW = new Date("2026-08-22T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const OLD = new Date(NOW.getTime() - 20 * DAY_MS); // > 14-day grace period
const RECENT = new Date(NOW.getTime() - 5 * DAY_MS); // < 14-day grace period
// Older than the 14-day grace period (so it still passes the outer
// pre-filter as a stale-looking candidate) but newer than VERY_OLD (so it
// excludes VERY_OLD rows via the per-row createdAt bound).
const STALE_ACK = new Date(NOW.getTime() - 16 * DAY_MS);
const VERY_OLD = new Date(NOW.getTime() - 30 * DAY_MS);

let userId: string;

beforeEach(async () => {
  const user = await db.user.findUniqueOrThrow({
    where: { email: "user@test.com" },
  });
  userId = user.id;
});

async function createSubscription(
  overrides: {
    createdAt?: Date;
    lastAckedAt?: Date | null;
  } = {},
) {
  return db.pushSubscription.create({
    data: {
      endpoint: `https://push.example.com/${crypto.randomUUID()}`,
      p256dh: "p256dh-key",
      auth: "auth-key",
      userId,
      // Defaults older than the audit rows' default (OLD) so
      // `createdAt: { gt: ackCutoff }` isn't tripped up by the two
      // defaults landing on the exact same instant.
      createdAt: overrides.createdAt ?? VERY_OLD,
      lastAckedAt: overrides.lastAckedAt ?? null,
    },
  });
}

async function createAuditRow(
  endpoint: string,
  overrides: { createdAt?: Date; acknowledgedAt?: Date | null } = {},
) {
  return db.communicationAuditLog.create({
    data: {
      communicationType: "push",
      to: endpoint,
      userId,
      createdAt: overrides.createdAt ?? OLD,
      acknowledgedAt: overrides.acknowledgedAt ?? null,
    },
  });
}

describe("pruneStalePushSubscriptions", () => {
  it("prunes a subscription with 5+ unacked sends whose oldest is past the grace period", async () => {
    const subscription = await createSubscription();
    for (let i = 0; i < 5; i++) {
      await createAuditRow(subscription.endpoint, { createdAt: OLD });
    }

    const result = await pruneStalePushSubscriptions(NOW);

    expect(result.prunedCount).toBe(1);
    expect(
      await db.pushSubscription.findUnique({ where: { id: subscription.id } }),
    ).toBeNull();
  });

  it("survives with only 4 unacked sends (under the threshold)", async () => {
    const subscription = await createSubscription();
    for (let i = 0; i < 4; i++) {
      await createAuditRow(subscription.endpoint, { createdAt: OLD });
    }

    const result = await pruneStalePushSubscriptions(NOW);

    expect(result.prunedCount).toBe(0);
    expect(
      await db.pushSubscription.findUnique({ where: { id: subscription.id } }),
    ).not.toBeNull();
  });

  it("survives when 5 unacked sends exist but the oldest is within the grace period", async () => {
    const subscription = await createSubscription();
    for (let i = 0; i < 5; i++) {
      await createAuditRow(subscription.endpoint, { createdAt: RECENT });
    }

    const result = await pruneStalePushSubscriptions(NOW);

    expect(result.prunedCount).toBe(0);
    expect(
      await db.pushSubscription.findUnique({ where: { id: subscription.id } }),
    ).not.toBeNull();
  });

  it("survives when one of 5 sends is individually acknowledged, leaving only 4 unacked", async () => {
    const subscription = await createSubscription();
    await createAuditRow(subscription.endpoint, {
      createdAt: OLD,
      acknowledgedAt: OLD,
    });
    for (let i = 0; i < 4; i++) {
      await createAuditRow(subscription.endpoint, { createdAt: OLD });
    }

    const result = await pruneStalePushSubscriptions(NOW);

    expect(result.prunedCount).toBe(0);
    expect(
      await db.pushSubscription.findUnique({ where: { id: subscription.id } }),
    ).not.toBeNull();
  });

  it("survives a subscription with zero sends ever", async () => {
    const subscription = await createSubscription();

    const result = await pruneStalePushSubscriptions(NOW);

    expect(result.prunedCount).toBe(0);
    expect(
      await db.pushSubscription.findUnique({ where: { id: subscription.id } }),
    ).not.toBeNull();
  });

  it("prunes only the dead subscription when the same user has a healthy one too", async () => {
    const deadSubscription = await createSubscription();
    for (let i = 0; i < 5; i++) {
      await createAuditRow(deadSubscription.endpoint, { createdAt: OLD });
    }

    const healthySubscription = await createSubscription({
      lastAckedAt: RECENT,
    });
    for (let i = 0; i < 5; i++) {
      await createAuditRow(healthySubscription.endpoint, { createdAt: OLD });
    }

    const result = await pruneStalePushSubscriptions(NOW);

    expect(result.prunedCount).toBe(1);
    expect(
      await db.pushSubscription.findUnique({
        where: { id: deadSubscription.id },
      }),
    ).toBeNull();
    expect(
      await db.pushSubscription.findUnique({
        where: { id: healthySubscription.id },
      }),
    ).not.toBeNull();
  });

  it("excludes unacked rows that predate a recent lastAckedAt bump", async () => {
    // 5 very-old, unacked, past-grace-period rows -- would be pruned on
    // their own -- but the subscription has since proven it's alive via a
    // later ack (still old enough itself to pass the outer pre-filter),
    // which should forgive everything before it.
    const subscription = await createSubscription({ lastAckedAt: STALE_ACK });
    for (let i = 0; i < 5; i++) {
      await createAuditRow(subscription.endpoint, { createdAt: VERY_OLD });
    }

    const result = await pruneStalePushSubscriptions(NOW);

    expect(result.prunedCount).toBe(0);
    expect(
      await db.pushSubscription.findUnique({ where: { id: subscription.id } }),
    ).not.toBeNull();
  });
});
