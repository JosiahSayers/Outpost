import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { newTrip, tripSearch } from "$/validation/trip";
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

tripRouter.post("/", validate({ body: newTrip }), async (req, res, next) => {
  const newTrip = await db.trip.create({
    data: {
      name: req.body.name,
      status: req.body.status,
      trail: req.body.trail,
      location: req.body.location,
      start: req.body.start,
      end: req.body.end,
      userId: req.session!.user.id,
    },
  });

  return res.status(201).json({ trip: transformers.trip(newTrip) });
});
