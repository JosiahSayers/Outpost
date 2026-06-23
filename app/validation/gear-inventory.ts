import { z } from "zod";

export const itemIdParamsValidator = z.object({ id: z.string() });

export const createGearInventoryItemValidator = z
  .strictObject({
    name: z.string().min(1),
    quantity: z.int().min(1).default(1),
    existingCategoryId: z.int().optional(),
    newCategoryName: z.string().optional(),
    grams: z.int().optional(),
  })
  .refine(
    (data) => data.existingCategoryId || data.newCategoryName,
    "A category must be provided",
  )
  .refine(
    (data) => (data.existingCategoryId && data.newCategoryName ? false : true),
    "Cannot have both a new and existing category",
  );
