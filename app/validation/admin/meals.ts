import { arrayQueryParam, numberQueryParam } from "$/validation/shared";
import z from "zod";

export const mealSearchParams = z.strictObject({
  query: z.string().optional(),
  vendor: arrayQueryParam(z.string(), []),
  brand: arrayQueryParam(z.string(), []),
  take: numberQueryParam(15, { min: 1, max: 50 }),
  skip: numberQueryParam(0),
});

export const incompleteParams = z.strictObject({
  take: numberQueryParam(15, { min: 1, max: 50 }),
  skip: numberQueryParam(0),
});

export const createMeal = z.strictObject({
  name: z.string().min(5).max(100),
  brand: z.string().max(50).optional(),
  calories: z.int().optional(),
  waterMl: z.int().optional(),
  dryWeightGrams: z.int().optional(),
  sourceImageUrl: z.httpUrl().max(1000).optional(),
  sourceVendor: z.string().min(1).max(50),
  sourceProductId: z.string().min(1).max(50),
  sourceUrl: z.httpUrl().max(1000),
  // No .default() here -- editMeal derives from this via .partial(), and a
  // default would coerce an omitted field to false on PATCH instead of
  // leaving it undefined ("don't touch"), same as every other field. POST
  // applies the false default explicitly in the router instead.
  readyOverride: z.boolean().optional(),
});

export const editMeal = createMeal.partial();

export const deleteMealSearchParams = z.strictObject({
  ignore: z.string().default("false"),
});
