import { sectionParams } from "$/validation/packing-list/section";
import { sortPosition } from "$/validation/sortable";
import z from "zod";

const name = z.string().trim().min(3);
const quantity = z.int().min(1);

export const itemParams = sectionParams.extend({
  itemId: z.string(),
});

export const createItem = z.strictObject({
  name,
  quantity,
  optional: z.boolean().default(false),
  sortPosition: sortPosition.optional(),
  assignedGearId: z.int().optional(),
  gearCategoryId: z.int().optional(),
});

export const updateItem = z.strictObject({
  name: name.optional(),
  quantity: quantity.optional(),
  optional: z.boolean().optional(),
  sortPosition: sortPosition.optional(),
  assignedGearId: z.int().optional(),
  gearCategoryId: z.int().optional(),
});
