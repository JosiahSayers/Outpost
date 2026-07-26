import { idParam } from "$/validation/shared";
import z from "zod";

export const tripPackingListParams = idParam.extend({
  listId: z.coerce.number().int(),
});

export const assignPackingList = z.strictObject({
  packingListId: z.int(),
});
