import z from "zod";

export const packingListSearch = z.strictObject({
  query: z.string().min(1),
});
