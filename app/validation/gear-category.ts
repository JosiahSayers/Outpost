import z from "zod";

export const gearCategorySearch = z.strictObject({
  query: z.string().min(1),
});

export const gearCategorySuggest = z.strictObject({
  itemName: z.string().min(1),
});
