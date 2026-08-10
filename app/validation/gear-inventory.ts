import { z } from "zod";

export const itemIdParamsValidator = z.object({ id: z.string() });

// Split from createGearInventoryItemValidator below so its per-field shape
// (e.g. `grams`) can be reused to build the edit drawer's own form-level zod
// schema -- .refine() below returns a ZodEffects, which has no `.shape`.
export const gearInventoryItemFields = z.strictObject({
  name: z.string().min(1),
  quantity: z.int().min(1).default(1),
  existingCategoryId: z.string().optional(),
  newCategoryName: z.string().optional(),
  grams: z.int().optional(),
});

export const createGearInventoryItemValidator = gearInventoryItemFields
  .refine(
    (data) => data.existingCategoryId || data.newCategoryName,
    "A category must be provided",
  )
  .refine(
    (data) => (data.existingCategoryId && data.newCategoryName ? false : true),
    "Cannot have both a new and existing category",
  );
