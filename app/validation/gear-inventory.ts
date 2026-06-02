import { z } from "zod";

export const createGearInventoryItemValidator = z
  .strictObject({
    name: z.string(),
    quantity: z.int().default(1),
    existingCategoryId: z.int().optional(),
    newCategoryName: z.string().optional(),
  })
  .refine(
    (data) => data.existingCategoryId || data.newCategoryName,
    "A category must be provided",
  )
  .refine(
    (data) => (data.existingCategoryId && data.newCategoryName ? false : true),
    "Cannot have both a new and existing category",
  );
