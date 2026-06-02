import z from "zod";

export const gearCategorySearch = z.strictObject({
  query: z.string().min(1),
});
