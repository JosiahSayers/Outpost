import { idParam } from "$/validation/shared";
import z from "zod";

const name = z.string().trim().min(3);
const sortPosition = z.int();

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
