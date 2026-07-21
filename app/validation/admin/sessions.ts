import { numberQueryParam } from "$/validation/shared";
import z from "zod";

export const adminSessionSearchQuery = z.strictObject({
  status: z.enum(["expired", "active"]).optional(),
  take: numberQueryParam(10),
  skip: numberQueryParam(0),
});
