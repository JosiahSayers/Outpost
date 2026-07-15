import { numberQueryParam } from "$/validation/shared";
import z from "zod";

export const adminUserSearchParams = z.strictObject({
  search: z.string().optional(),
  take: numberQueryParam(10),
  skip: numberQueryParam(0),
});
