import z from "zod";

export const placeSearch = z.strictObject({
  query: z.string().min(1),
  state: z.string().length(2).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  // Interpreted as `=== "true"` in the route (query params arrive as strings).
  includeLowValue: z.string().optional(),
});
