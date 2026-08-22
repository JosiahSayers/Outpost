import { defineJob } from "$/jobs/define-job";
import { defaultJobOptions } from "$/jobs/workers/default-options";
import { db } from "$/utils/db";

export const NOTIFICATIONS__PRUNE_STALE_PUSH_SUBSCRIPTIONS =
  "notifications__prune_stale_push_subscriptions";

// Matches defaultJobOptions.attempts -- the existing "give up after 5
// tries" convention -- rather than an arbitrary number.
const UNACKED_THRESHOLD = 5;

// Both this and UNACKED_THRESHOLD must hold before pruning: attempt-count
// alone could misfire on a single unlucky offline stretch (phone off for a
// week), and a pure time window alone would be too slow to clear real
// zombies given how infrequent these event-driven notifications are.
const GRACE_PERIOD_DAYS = 14;

const BATCH_SIZE = 200;

// iOS's push relay can silently swallow notifications forever without ever
// returning the 404/410 send-push-to-device.ts already prunes on -- this
// catches that case by looking for subscriptions that have gone unacked
// despite repeated delivery attempts. See the Phase 3 plan (BTP-112) for
// the full reasoning behind the two-signal design below.
export async function pruneStalePushSubscriptions(now: Date = new Date()) {
  const gracePeriodCutoff = new Date(now);
  gracePeriodCutoff.setUTCDate(
    gracePeriodCutoff.getUTCDate() - GRACE_PERIOD_DAYS,
  );

  const prunedIds: string[] = [];
  let cursor: string | undefined;

  while (true) {
    // Pre-filtered so a subscription with a recent lastAckedAt never
    // touches CommunicationAuditLog at all: if it was acked more recently
    // than the grace period, every unacked send since then necessarily
    // happened after that ack too, so it can't yet satisfy the grace-period
    // condition below regardless of count.
    const subscriptions = await db.pushSubscription.findMany({
      where: {
        OR: [
          { lastAckedAt: null, createdAt: { lt: gracePeriodCutoff } },
          { lastAckedAt: { lt: gracePeriodCutoff } },
        ],
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });
    if (subscriptions.length === 0) break;
    cursor = subscriptions.at(-1)!.id;

    for (const subscription of subscriptions) {
      const ackCutoff = subscription.lastAckedAt ?? subscription.createdAt;
      // acknowledgedAt is the authoritative per-row signal (was *this*
      // specific push acknowledged); the createdAt bound keeps the count
      // scoped to "since we last had any evidence this device was alive" --
      // without it, a device that answered a later push would still get
      // dinged for an earlier one iOS coalesced/dropped without ever
      // running the SW's push handler for it.
      const unackedWhere = {
        to: subscription.endpoint,
        communicationType: "push" as const,
        createdAt: { gt: ackCutoff },
        acknowledgedAt: null,
      };

      const unackedCount = await db.communicationAuditLog.count({
        where: unackedWhere,
      });
      if (unackedCount < UNACKED_THRESHOLD) continue;

      const oldestUnacked = await db.communicationAuditLog.findFirst({
        where: unackedWhere,
        orderBy: { createdAt: "asc" },
      });
      if (oldestUnacked && oldestUnacked.createdAt <= gracePeriodCutoff) {
        prunedIds.push(subscription.id);
      }
    }

    if (subscriptions.length < BATCH_SIZE) break;
  }

  if (prunedIds.length > 0) {
    await db.pushSubscription.deleteMany({ where: { id: { in: prunedIds } } });
  }

  return { prunedCount: prunedIds.length };
}

const pruneStalePushSubscriptionsJob = defineJob({
  name: NOTIFICATIONS__PRUNE_STALE_PUSH_SUBSCRIPTIONS,
  processor: async () => pruneStalePushSubscriptions(),
  defaultJobOptions,
  schedule: {
    id: "prune-stale-push-subscriptions-nightly",
    pattern: "1 3 * * *",
    tz: "America/New_York",
  },
});

export const {
  queue: pruneStalePushSubscriptionsQueue,
  worker: pruneStalePushSubscriptionsWorker,
} = pruneStalePushSubscriptionsJob;

export default pruneStalePushSubscriptionsJob;
