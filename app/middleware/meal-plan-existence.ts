import { db } from "$/utils/db";
import type { RequestHandler } from "express";

export const mealPlanDayExists: RequestHandler = async (req, res, next) => {
  const mealPlanDay = await db.mealPlanDay.findUnique({
    where: {
      tripId_dayNumber: {
        tripId: String(req.params.id),
        dayNumber: Number(req.params.day),
      },
    },
  });

  if (!mealPlanDay) {
    return res.sendStatus(404);
  }

  req.mealPlanDayId = mealPlanDay.id;
  return next();
};

export const mealPlanItemExists: RequestHandler = async (req, res, next) => {
  const mealPlanDayWithItem = await db.mealPlanDay.findUnique({
    where: {
      tripId_dayNumber: {
        tripId: String(req.params.id),
        dayNumber: Number(req.params.day),
      },
      items: {
        some: {
          id: String(req.params.itemId),
        },
      },
    },
  });

  if (!mealPlanDayWithItem) {
    return res.sendStatus(404);
  }

  return next();
};
