import { idParam } from "$/validation/shared";
import { sortPosition } from "$/validation/sortable";
import z from "zod";

const name = z.string().trim().min(3);

export const createSection = z.strictObject({
  name,
  sortPosition: sortPosition.optional(),
});

export const sectionParams = idParam.extend({
  sectionId: z.string(),
});

export const updateSection = z.strictObject({
  name: name.optional(),
  sortPosition: sortPosition.optional(),
});
