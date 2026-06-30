import z from "zod";

export const packingListSearch = z.strictObject({
  query: z.string().min(1),
});

const packingListName = z.string().trim().min(3);

export const newPackingList = z.strictObject({
  name: packingListName,
  copiedFromPackingListId: z.int().optional(),
});

export const editPackingList = z.strictObject({
  name: packingListName,
  description: z.string().trim().optional(),
});
