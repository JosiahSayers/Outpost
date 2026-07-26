import { idParam } from "$/validation/shared";
import z from "zod";

export const tripPackingListParams = idParam.extend({
  listId: z.string(),
});

export const tripPackingListItemParams = tripPackingListParams.extend({
  itemId: z.string(),
});

export const assignPackingList = z.strictObject({
  packingListId: z.string(),
});

export const editTripPackingListItem = z.strictObject({
  packed: z.boolean().optional(),
  notNeeded: z.boolean().optional(),
});
