import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { tripSearch } from "$/validation/trip";
import { Router } from "express";
import validate from "express-zod-safe";

export const tripRouter = Router();
tripRouter.use(requireValidSession);

tripRouter.get("/", validate({ query: tripSearch }), async (req, res, next) => {
  const trips = await db.trip.findMany({
    where: {
      userId: req.session!.user.id,
    },
    take: req.query.take,
    orderBy: [{ status: "asc" }, { start: "asc" }],
  });

  return res.json({ trips: trips.map(transformers.trip) });
});
