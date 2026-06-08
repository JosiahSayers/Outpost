import z from "zod";

export const idParam = z.strictObject({
  id: z.string(),
});
