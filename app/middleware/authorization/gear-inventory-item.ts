import { db } from "$/utils/db";
import type { RequestHandler } from "express";

export const userCanAccessGearInventoryItem: RequestHandler = async (
  req,
  res,
  next,
) => {
  const item = await db.gearInventoryItem.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!item) {
    return res.sendStatus(404);
  }

  if (item.userId !== req.session!.user.id) {
    return res.sendStatus(403);
  }

  return next();
};
