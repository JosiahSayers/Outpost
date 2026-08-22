import { requireValidSession } from "$/middleware/require-valid-session";
import { db } from "$/utils/db";
import {
  ackPushSubscription,
  createPushSubscription,
  deletePushSubscription,
} from "$/validation/push-subscription";
import { Router } from "express";
import validate from "express-zod-safe";

export const pushSubscriptionsRouter = Router();

pushSubscriptionsRouter.use(requireValidSession);

pushSubscriptionsRouter.post(
  "/",
  validate({ body: createPushSubscription }),
  async (req, res) => {
    const { endpoint, keys } = req.body;
    const userAgent = req.headers["user-agent"] ?? null;

    await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.session!.user.id,
        userAgent,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.session!.user.id,
        userAgent,
      },
    });

    return res.sendStatus(201);
  },
);

// Delivery-confirmation beacon fired by the service worker's push handler
// after it successfully shows a notification -- see service-worker.js.
// lastAckedAt is the coarse "this device is alive" signal the nightly
// stale-prune job pre-filters on; acknowledgedAt on the specific audit row
// (when notificationId is present) is the precise per-push signal that job
// actually counts against the unacked threshold. notificationId is
// optional so a SW-side JSON parse failure doesn't also cost us the
// lastAckedAt bump -- see the Phase 3 plan for the full reasoning.
pushSubscriptionsRouter.post(
  "/ack",
  validate({ body: ackPushSubscription }),
  async (req, res) => {
    const { endpoint, notificationId } = req.body;
    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint },
    });
    if (!subscription || subscription.userId !== req.session!.user.id) {
      return res.sendStatus(404);
    }

    await db.pushSubscription.update({
      where: { endpoint },
      data: { lastAckedAt: new Date() },
    });

    if (notificationId) {
      // updateMany + scoped userId rather than findUnique-then-check, since
      // a mismatched or already-pruned id should just no-op, not fail the
      // ack.
      await db.communicationAuditLog.updateMany({
        where: { id: notificationId, userId: req.session!.user.id },
        data: { acknowledgedAt: new Date() },
      });
    }

    return res.sendStatus(200);
  },
);

pushSubscriptionsRouter.delete(
  "/",
  validate({ body: deletePushSubscription }),
  async (req, res) => {
    const subscription = await db.pushSubscription.findUnique({
      where: { endpoint: req.body.endpoint },
    });

    if (!subscription || subscription.userId !== req.session!.user.id) {
      return res.sendStatus(404);
    }

    await db.pushSubscription.delete({
      where: { endpoint: req.body.endpoint },
    });

    return res.sendStatus(200);
  },
);
