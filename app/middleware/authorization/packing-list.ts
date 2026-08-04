import { db } from "$/utils/db";
import type { RequestHandler } from "express";

export const userCanAccessPackingList: RequestHandler = async (
  req,
  res,
  next,
) => {
  const packingList = await db.packingList.findUnique({
    where: { id: String(req.params.id) },
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

export const userCanEditPackingList: RequestHandler = async (
  req,
  res,
  next,
) => {
  const packingList = await db.packingList.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!packingList) {
    return res.sendStatus(404);
  }

  if (!packingList.userId || packingList.userId !== req.session!.user.id) {
    return res.sendStatus(403);
  }

  return next();
};

// `req.params.id` (the packing list) is already verified as owned/editable
// by this point via `userCanEditPackingList`. This guards against a caller
// swapping in a `sectionId` that belongs to a different packing list.
export const requireSectionBelongsToPackingList: RequestHandler = async (
  req,
  res,
  next,
) => {
  const section = await db.packingListSection.findUnique({
    where: {
      id: String(req.params.sectionId),
      packingListId: String(req.params.id),
    },
  });

  if (!section) {
    return res.sendStatus(404);
  }

  return next();
};
