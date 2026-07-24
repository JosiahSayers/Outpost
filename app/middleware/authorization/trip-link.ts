import { db } from "$/utils/db";
import type { RequestHandler } from "express";

export const tripLinkExists: RequestHandler = async (req, res, next) => {
  const link = await db.tripLink.findUnique({
    where: {
      tripId: String(req.params.id),
      id: String(req.params.linkId),
    },
  });

  if (!link) {
    return res.sendStatus(404);
  }

  return next();
};
