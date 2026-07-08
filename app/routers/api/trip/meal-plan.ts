import { prepareMealPlanDay } from "$/frontend/utils/default-data/meal-plan-day";
import { transformers } from "$/transformers";
import { db } from "$/utils/db";
import { idParam } from "$/validation/shared";
import {
  createMealPlanDay,
  editMealPlanDay,
  mealPlanDayParams,
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
      data: prepareMealPlanDay(
        req.params.id,
        req.body.dayNumber,
        req.body.date,
      ),
      include: {
        meals: true,
      },
    });

    return res
      .status(201)
      .json({ mealPlanDay: transformers.mealPlanDay(newDay) });
  },
);

mealPlanRouter.delete(
  "/days/:day",
  validate({ params: mealPlanDayParams }),
  async (req, res) => {
    const day = await db.mealPlanDay.findUnique({
      where: {
        tripId_dayNumber: {
          tripId: req.params.id,
          dayNumber: Number(req.params.day),
        },
      },
    });

    if (!day) {
      return res.sendStatus(404);
    }

    await db.mealPlanDay.delete({
      where: {
        id: day.id,
      },
    });

    return res.sendStatus(200);
  },
);

mealPlanRouter.patch(
  "/days/:day",
  validate({ params: mealPlanDayParams, body: editMealPlanDay }),
  async (req, res) => {
    const day = await db.mealPlanDay.findUnique({
      where: {
        tripId_dayNumber: {
          tripId: req.params.id,
          dayNumber: Number(req.params.day),
        },
      },
    });

    if (!day) {
      return res.sendStatus(404);
    }

    const updatedDay = await db.mealPlanDay.update({
      where: {
        id: day.id,
      },
      data: {
        date: req.body.date,
      },
      include: {
        meals: true,
      },
    });

    return res.json({ mealPlanDay: transformers.mealPlanDay(updatedDay) });
  },
);
