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

export const createMealPlanItem = z.discriminatedUnion("mode", [
  z.strictObject({
    mode: z.literal("existing"),
    mealPlanItemId: z.string(),
    meal: z.enum(MealName),
    quantity: z.int().optional(),
  }),
  z.strictObject({
    mode: z.literal("new"),
    name: z.string().min(1),
    brand: z.string().optional(),
    calories: z.int().optional().default(0),
    waterMl: z.int().optional(),
    dryWeightGrams: z.int().optional(),
    meal: z.enum(MealName),
    quantity: z.int().optional(),
  }),
  z.strictObject({
    mode: z.literal("public"),
    publicMealItemId: z.string(),
    meal: z.enum(MealName),
    quantity: z.int().optional(),
  }),
]);

export const editMealPlanItem = z.strictObject({
  meal: z.enum(MealName).optional(),
  quantity: z.int().optional(),
  name: z.string().min(1).optional(),
  // nullable so a PATCH can clear these — omitting them means "unchanged"
  brand: z.string().nullable().optional(),
  calories: z.int().optional(),
  waterMl: z.int().nullable().optional(),
  dryWeightGrams: z.int().nullable().optional(),
  fork: z.boolean().optional().default(false),
});

export const editMealPlanItemStatus = z.strictObject({
  purchased: z.boolean().optional(),
  packed: z.boolean().optional(),
});

export const mealPlanItemSearch = z.strictObject({
  query: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  excludeTripId: z.string().optional(),
  meal: z.enum(MealName).optional(),
});
