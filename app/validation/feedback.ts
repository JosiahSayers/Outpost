import z from "zod";

export const createFeedback = z.strictObject({
  text: z.string().min(15).max(750),
});
