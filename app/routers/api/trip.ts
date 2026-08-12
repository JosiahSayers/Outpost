import { createDefaultMealPlan } from "$/frontend/utils/default-data/meal-plan-day";
import { prepareDefaultTripTasks } from "$/frontend/utils/default-data/trip-tasks";
import { userCanEditTrip } from "$/middleware/authorization/trip";
import { pdfRateLimiter } from "$/middleware/rate-limit";
import { requireValidSession } from "$/middleware/require-valid-session";
import { tripLinkRouter } from "$/routers/api/trip/link";
import { mealPlanRouter } from "$/routers/api/trip/meal-plan";
import { tripPackingListRouter } from "$/routers/api/trip/packing-list";
import { tripTaskRouter } from "$/routers/api/trip/task";
import { transformers } from "$/transformers";
import { paginate } from "$/transformers/pagination";
import { generateTripSummaryPdf } from "$/utils/pdf/trip-summary/generate-trip-summary-pdf";
import { db } from "$/utils/db";
import { idParam } from "$/validation/shared";
import {
  editTrip,
  newTrip,
  tripSearch,
  tripSummaryPdfQuery,
} from "$/validation/trip";
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
      orderBy: [{ status: "asc" }, { start: "asc" }, { id: "asc" }],
    }),
    db.trip.count({ where }),
  ]);

  const page = paginate(
    trips,
    transformers.trip,
    total,
    req.query.take,
    "trips",
  );

  return res.json(page);
});

tripRouter.get(
  "/:id",
  userCanEditTrip,
  validate({ params: idParam }),
  async (req, res) => {
    const trip = await db.trip.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: true,
        mealPlanDays: {
          include: {
            items: { include: { mealPlanItem: true } },
          },
        },
        links: true,
        packingList: {
          include: {
            packingList: {
              include: {
                packingListSections: {
                  include: {
                    items: {
                      include: {
                        tripPackingListItemStatuses: true,
                        assignedGear: {
                          include: {
                            category: true,
                          },
                        },
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    return res.json({ trip: transformers.fullTrip(trip!) });
  },
);

tripRouter.get(
  "/:id/summary-pdf",
  pdfRateLimiter,
  userCanEditTrip,
  validate({ params: idParam, query: tripSummaryPdfQuery }),
  async (req, res) => {
    const trip = await db.trip.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: true,
        mealPlanDays: {
          include: {
            items: { include: { mealPlanItem: true } },
          },
        },
        links: true,
        packingList: {
          include: {
            packingList: {
              include: {
                packingListSections: {
                  include: {
                    items: {
                      include: {
                        tripPackingListItemStatuses: true,
                        assignedGear: {
                          include: {
                            category: true,
                          },
                        },
                        category: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${trip!.name} - Trip Summary.pdf"`,
    );

    // The unit to render is resolved client-side and passed straight
    // through — see tripSummaryPdfQuery in app/validation/trip.ts for why.
    return await generateTripSummaryPdf(
      trip!,
      {
        sections: new Set(req.query.sections),
        taskBlank: req.query.taskStatus === "blank",
        packingListBlank: req.query.packingListStatus === "blank",
        fluidUnit: req.query.fluidUnit,
        weightUnit: req.query.weightUnit,
      },
      res,
    );
  },
);

tripRouter.post("/", validate({ body: newTrip }), async (req, res, next) => {
  let newId: string | undefined;

  await db.$transaction(async (tx) => {
    const newTrip = await tx.trip.create({
      data: {
        name: req.body.name,
        status: req.body.status,
        trail: req.body.trail,
        location: req.body.location,
        start: req.body.start,
        end: req.body.end,
        userId: req.session!.user.id,
        tasks: {
          createMany: {
            data: prepareDefaultTripTasks(req.body),
          },
        },
      },
    });

    await createDefaultMealPlan(newTrip, tx);

    newId = newTrip.id;
  });

  const newTrip = await db.trip.findUnique({
    where: { id: newId },
    include: {
      tasks: true,
      mealPlanDays: {
        include: {
          items: { include: { mealPlanItem: true } },
        },
      },
    },
  });

  if (!newTrip) {
    return res.sendStatus(500);
  }

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

tripRouter.use("/:id/tasks", userCanEditTrip, tripTaskRouter);
tripRouter.use("/:id/meal-plan", userCanEditTrip, mealPlanRouter);
tripRouter.use("/:id/links", userCanEditTrip, tripLinkRouter);
tripRouter.use("/:id/packing-list", userCanEditTrip, tripPackingListRouter);
