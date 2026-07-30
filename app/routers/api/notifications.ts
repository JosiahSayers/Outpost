import { userCanEditNotification } from "$/middleware/authorization/notification";
import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { db } from "$/utils/db";
import {
  editNotification,
  notificationSearch,
} from "$/validation/notification";
import { idParam } from "$/validation/shared";
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

notificationsRouter.patch(
  "/:id",
  validate({ params: idParam, body: editNotification }),
  userCanEditNotification,
  async (req, res) => {
    const updatedNotification = await db.notification.update({
      where: {
        id: req.params.id,
      },
      data: {
        read: req.body.read,
        dismissed: req.body.dismissed,
      },
    });

    return res.json({
      notification: transformers.notification(updatedNotification),
    });
  },
);
