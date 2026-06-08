import { db } from "$/utils/db";
import type { RequestHandler } from "express";

export const userCanAccessPackingList: RequestHandler = async (
  req,
  res,
  next,
) => {
  const packingList = await db.packingList.findUnique({
    where: { id: Number(req.params.id) },
  });

  if (!packingList) {
    return res.sendStatus(404);
  }

  if (
    packingList.userId !== req.session!.user.id &&
    packingList.public !== true
  ) {
    return res.sendStatus(403);
  }

  return next();
};
