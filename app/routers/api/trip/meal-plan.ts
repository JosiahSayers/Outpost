import {
  mealPlanDayExists,
  mealPlanItemExists,
} from "$/middleware/meal-plan-existence";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { searchMealPlanItems } from "$/utils/search-helpers";
import { idParam } from "$/validation/shared";
import {
  createMealPlanDay,
  createMealPlanItem,
  editMealPlanDay,
  editMealPlanItem,
  editMealPlanItemStatus,
  mealPlanDayParams,
  mealPlanItemParams,
  mealPlanItemSearch,
} from "$/validation/trip/meal-plan";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/client";
import { Router } from "express";
import validate from "express-zod-safe";

export const mealPlanRouter = Router({ mergeParams: true });

mealPlanRouter.post(
  "/days",
  validate({ params: idParam, body: createMealPlanDay }),
  async (req, res) => {
    const existing = await db.mealPlanDay.findUnique({
      where: {
        tripId_dayNumber: {
          dayNumber: req.body.dayNumber,
          tripId: req.params.id,
        },
      },
    });

    if (existing) {
      return res.status(400).json({
        error: `Day ${req.body.dayNumber} already exists for this trip`,
      });
    }

    const newDay = await db.mealPlanDay.create({
      data: {
        tripId: req.params.id,
        dayNumber: req.body.dayNumber,
        date: req.body.date,
      },
      include: {
        items: {
          include: {
            mealPlanItem: true,
          },
        },
      },
    });

    return res
      .status(201)
      .json({ mealPlanDay: transformers.mealPlanDay(newDay) });
  },
);

mealPlanRouter.delete(
  "/days/:day",
  mealPlanDayExists,
  validate({ params: mealPlanDayParams }),
  async (req, res) => {
    await db.mealPlanDay.delete({
      where: {
        tripId_dayNumber: {
          tripId: req.params.id,
          dayNumber: Number(req.params.day),
        },
      },
    });

    return res.sendStatus(200);
  },
);

mealPlanRouter.patch(
  "/days/:day",
  mealPlanDayExists,
  validate({ params: mealPlanDayParams, body: editMealPlanDay }),
  async (req, res) => {
    const updatedDay = await db.mealPlanDay.update({
      where: {
        tripId_dayNumber: {
          tripId: req.params.id,
          dayNumber: Number(req.params.day),
        },
      },
      data: {
        date: req.body.date,
      },
      include: {
        items: {
          include: {
            mealPlanItem: true,
          },
        },
      },
    });

    return res.json({ mealPlanDay: transformers.mealPlanDay(updatedDay) });
  },
);

mealPlanRouter.get(
  "/items",
  validate({ params: idParam, query: mealPlanItemSearch }),
  async (req, res) => {
    const matchingItems = await searchMealPlanItems(
      req.query.query,
      req.session!.user.id,
      {
        limit: req.query.limit,
        excludeTripId: req.query.excludeTripId,
        meal: req.query.meal,
      },
    );

    return res.json({
      items: matchingItems.map(transformers.mealPlanItemSummary),
    });
  },
);

mealPlanRouter.post(
  "/days/:day/items",
  mealPlanDayExists,
  validate({ params: mealPlanDayParams, body: createMealPlanItem }),
  async (req, res) => {
    if (req.body.mode === "existing") {
      const item = await db.mealPlanItem.findUnique({
        where: { id: req.body.mealPlanItemId, userId: req.session!.user.id },
      });

      if (!item) {
        return res.status(404).json({ error: "Meal plan item not found" });
      }
    }

    const dayItem = await db.$transaction(async (tx) => {
      const mealPlanItemId =
        req.body.mode === "existing"
          ? req.body.mealPlanItemId
          : (
              await tx.mealPlanItem.create({
                data: {
                  userId: req.session!.user.id,
                  name: req.body.name,
                  brand: req.body.brand,
                  calories: req.body.calories,
                  waterMl: req.body.waterMl,
                  dryWeightGrams: req.body.dryWeightGrams,
                },
              })
            ).id;

      return tx.mealPlanDayItem.upsert({
        where: {
          mealPlanDayId_mealPlanItemId_meal: {
            mealPlanDayId: req.mealPlanDayId!,
            mealPlanItemId,
            meal: req.body.meal,
          },
        },
        create: {
          mealPlanDayId: req.mealPlanDayId!,
          mealPlanItemId,
          meal: req.body.meal,
          quantity: req.body.quantity ?? 1,
        },
        update: {
          quantity: { increment: req.body.quantity ?? 1 },
        },
        include: { mealPlanItem: true },
      });
    });

    return res
      .status(201)
      .json({ mealPlanItem: transformers.mealPlanItem(dayItem) });
  },
);

mealPlanRouter.patch(
  "/days/:day/items/:itemId",
  mealPlanItemExists,
  validate({ params: mealPlanItemParams, body: editMealPlanItem }),
  async (req, res) => {
    const {
      fork,
      meal,
      quantity,
      name,
      brand,
      calories,
      waterMl,
      dryWeightGrams,
    } = req.body;
    const itemFields = { name, brand, calories, waterMl, dryWeightGrams };
    const itemFieldsProvided = Object.values(itemFields).some(
      (value) => value !== undefined,
    );

    const updated = await db.$transaction(async (tx) => {
      const current = await tx.mealPlanDayItem.findUniqueOrThrow({
        where: { id: req.params.itemId },
        include: { mealPlanItem: true },
      });

      let mealPlanItemId = current.mealPlanItemId;

      if (fork) {
        const forked = await tx.mealPlanItem.create({
          data: {
            userId: req.session!.user.id,
            name: name ?? current.mealPlanItem.name,
            brand: brand !== undefined ? brand : current.mealPlanItem.brand,
            calories: calories ?? current.mealPlanItem.calories,
            waterMl:
              waterMl !== undefined ? waterMl : current.mealPlanItem.waterMl,
            dryWeightGrams:
              dryWeightGrams !== undefined
                ? dryWeightGrams
                : current.mealPlanItem.dryWeightGrams,
          },
        });
        mealPlanItemId = forked.id;
      } else if (itemFieldsProvided) {
        await tx.mealPlanItem.update({
          where: { id: current.mealPlanItemId },
          data: itemFields,
        });
      }

      return tx.mealPlanDayItem.update({
        where: { id: req.params.itemId },
        data: { meal, quantity, mealPlanItemId },
        include: { mealPlanItem: true },
      });
    });

    return res.json({ mealPlanItem: transformers.mealPlanItem(updated) });
  },
);

mealPlanRouter.delete(
  "/days/:day/items/:itemId",
  mealPlanItemExists,
  validate({ params: mealPlanItemParams }),
  async (req, res) => {
    await db.mealPlanDayItem.delete({
      where: { id: req.params.itemId },
    });

    return res.sendStatus(200);
  },
);

mealPlanRouter.patch(
  "/days/:day/items/:itemId/status",
  mealPlanItemExists,
  validate({ params: mealPlanItemParams, body: editMealPlanItemStatus }),
  async (req, res) => {
    const updated = await db.mealPlanDayItem.update({
      where: { id: req.params.itemId },
      data: {
        purchased: req.body.purchased,
        packed: req.body.packed,
      },
      include: { mealPlanItem: true },
    });

    return res.json({
      item: transformers.mealPlanItem(updated),
    });
  },
);

// @ts-expect-error express types are wonky for error handling middleware
mealPlanRouter.use((err, req, res, next) => {
  if (err instanceof PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: "This item is already placed in that meal slot on this day",
      });
    }
  }

  return next(err);
});
