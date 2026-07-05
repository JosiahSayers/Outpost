import { userCanEditTrip } from "$/middleware/authorization/trip";
import { requireValidSession } from "$/middleware/require-valid-session";
import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { db } from "$/utils/db";
import { idParam } from "$/validation/shared";
import { editTrip, newTrip, tripSearch } from "$/validation/trip";
import { Router } from "express";
import validate from "express-zod-safe";

export const tripRouter = Router();
tripRouter.use(requireValidSession);

tripRouter.get("/", validate({ query: tripSearch }), async (req, res, next) => {
  const where = { userId: req.session!.user.id };

  const [trips, total] = await Promise.all([
    db.trip.findMany({
      where,
      take: req.query.take,
      skip: req.query.skip,
      orderBy: [{ status: "asc" }, { start: "asc" }],
    }),
    db.trip.count({ where }),
  ]);

  const page = paginate(trips, transformers.trip, total, req.query.take);

  return res.json({
    trips: page.items,
    total: page.total,
    pageSize: page.pageSize,
  });
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

tripRouter.delete(
  "/:id",
  userCanEditTrip,
  validate({ params: idParam }),
  async (req, res) => {
    await db.trip.delete({ where: { id: req.params.id } });
    return res.sendStatus(200);
  },
);

tripRouter.patch(
  "/:id",
  userCanEditTrip,
  validate({ body: editTrip, params: idParam }),
  async (req, res) => {
    const updatedTrip = await db.trip.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        status: req.body.status,
        trail: req.body.trail,
        location: req.body.location,
        start: req.body.start,
        end: req.body.end,
      },
    });

    return res.json({ trip: transformers.trip(updatedTrip) });
  },
);
