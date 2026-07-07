import { idParam, isoDate } from "$/validation/shared";
import z from "zod";

export const mealPlanDayParams = idParam.extend({
  day: z.string(),
});

export const createMealPlanDay = z.strictObject({
  dayNumber: z.int().min(1),
  date: isoDate,
});

export const editMealPlanDay = z.strictObject({
  date: isoDate,
});
