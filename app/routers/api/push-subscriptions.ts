import { requireValidSession } from "$/middleware/require-valid-session";
import { db } from "$/utils/db";
import {
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

    await db.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.session!.user.id,
      },
      update: {
        p256dh: keys.p256dh,
        auth: keys.auth,
        userId: req.session!.user.id,
      },
    });

    return res.sendStatus(201);
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
