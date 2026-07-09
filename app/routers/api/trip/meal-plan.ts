import {
  mealPlanDayExists,
  mealPlanItemExists,
} from "$/middleware/meal-plan-existence";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { idParam } from "$/validation/shared";
import {
  createMealPlanDay,
  createMealPlanItem,
  editMealPlanDay,
  editMealPlanItem,
  mealPlanDayParams,
  mealPlanItemParams,
} from "$/validation/trip/meal-plan";
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
        items: true,
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
        items: true,
      },
    });

    return res.json({ mealPlanDay: transformers.mealPlanDay(updatedDay) });
  },
);

mealPlanRouter.post(
  "/days/:day/items",
  mealPlanDayExists,
  validate({ params: mealPlanDayParams, body: createMealPlanItem }),
  async (req, res) => {
    const newItem = await db.mealPlanItem.create({
      data: {
        mealPlanDayId: req.mealPlanDayId!,
        name: req.body.name,
        calories: req.body.calories,
        meal: req.body.meal,
        quantity: req.body.quantity,
        waterMl: req.body.waterMl,
        dryWeightGrams: req.body.dryWeightGrams,
      },
    });

    return res
      .status(201)
      .json({ mealPlanItem: transformers.mealPlanItem(newItem) });
  },
);

mealPlanRouter.patch(
  "/days/:day/items/:itemId",
  mealPlanItemExists,
  validate({ params: mealPlanItemParams, body: editMealPlanItem }),
  async (req, res) => {
    const updated = await db.mealPlanItem.update({
      where: { id: req.params.itemId },
      data: {
        name: req.body.name,
        calories: req.body.calories,
        meal: req.body.meal,
        quantity: req.body.quantity,
        waterMl: req.body.waterMl,
        dryWeightGrams: req.body.dryWeightGrams,
      },
    });

    return res.json({ mealPlanItem: transformers.mealPlanItem(updated) });
  },
);

mealPlanRouter.delete(
  "/days/:day/items/:itemId",
  mealPlanItemExists,
  validate({ params: mealPlanItemParams }),
  async (req, res) => {
    await db.mealPlanItem.delete({
      where: { id: req.params.itemId },
    });

    return res.sendStatus(200);
  },
);
