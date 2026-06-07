import z from "zod";

export const packingListSearch = z.strictObject({
  query: z.string().min(1),
});

export const newPackingList = z.strictObject({
  name: z.string().trim().min(3),
  copiedFromPackingListId: z.int().optional(),
});
