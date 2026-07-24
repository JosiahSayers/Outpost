import z from "zod";

export const createLink = z.strictObject({
  url: z.httpUrl(),
});
