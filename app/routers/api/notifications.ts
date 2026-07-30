import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { db } from "$/utils/db";
import { notificationSearch } from "$/validation/notification";
import { Router } from "express";
import validate from "express-zod-safe";

export const notificationsRouter = Router();

notificationsRouter.use(requireValidSession);

notificationsRouter.get(
  "/",
  validate({ query: notificationSearch }),
  async (req, res) => {
    const where = {
      userId: req.session!.user.id,
      read: req.query.read,
      dismissed: req.query.dismissed,
    };

    const [notifications, total] = await db.$transaction([
      db.notification.findMany({
        where,
        take: req.query.take,
        skip: req.query.skip,
        orderBy: { createdAt: "desc" },
      }),
      db.notification.count({ where }),
    ]);

    const page = paginate(
      notifications,
      transformers.notification,
      total,
      req.query.take,
    );

    return res.json({
      notifications: page.items,
      pageSize: page.pageSize,
      total: page.total,
    });
  },
);
