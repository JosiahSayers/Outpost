import { db } from "$/utils/db";
import type { RequestHandler } from "express";

export const userCanEditTrip: RequestHandler = async (req, res, next) => {
  const trip = await db.trip.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!trip) {
    return res.sendStatus(404);
  }

  if (trip.userId !== req.session!.user.id) {
    return res.sendStatus(403);
  }

  return next();
};
