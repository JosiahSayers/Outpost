import { numberQueryParam } from "$/validation/shared";
import z from "zod";

export const tripSearch = z.strictObject({
  take: numberQueryParam(3),
});
