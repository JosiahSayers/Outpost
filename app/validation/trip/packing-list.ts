import { idParam } from "$/validation/shared";
import z from "zod";

export const tripPackingListParams = idParam.extend({
  listId: z.coerce.number().int(),
});

export const tripPackingListItemParams = tripPackingListParams.extend({
  itemId: z.coerce.number().int(),
});

export const assignPackingList = z.strictObject({
  packingListId: z.int(),
});

export const editTripPackingListItem = z.strictObject({
  packed: z.boolean().optional(),
  notNeeded: z.boolean().optional(),
});
