import { db } from "$/utils/db";
import type { RequestHandler } from "express";

export const userCanEditNotification: RequestHandler = async (
  req,
  res,
  next,
) => {
  const notification = await db.notification.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!notification) {
    return res.sendStatus(404);
  }

  if (notification.userId !== req.session!.user.id) {
    return res.sendStatus(403);
  }

  return next();
};
