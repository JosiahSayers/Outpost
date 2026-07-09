import { idParam, isoDate } from "$/validation/shared";
import z from "zod";
import { MealName } from "../../../generated/prisma/enums";

export const mealPlanDayParams = idParam.extend({
  day: z.string(),
});

export const mealPlanItemParams = mealPlanDayParams.extend({
  itemId: z.string(),
});

export const createMealPlanDay = z.strictObject({
  dayNumber: z.int().min(1),
  date: isoDate,
});

export const editMealPlanDay = z.strictObject({
  date: isoDate,
});

export const createMealPlanItem = z.strictObject({
  name: z.string().min(1),
  calories: z.int().optional().default(0),
  meal: z.enum(MealName),
  quantity: z.int().optional(),
  waterMl: z.int().optional(),
  dryWeightGrams: z.int().optional(),
});

export const editMealPlanItem = createMealPlanItem.partial().extend({
  // .partial() doesn't strip the .default(0) on calories, which would
  // otherwise reset calories to 0 whenever a PATCH omits the field
  calories: z.int().optional(),
});
