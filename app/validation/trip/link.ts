import { idParam } from "$/validation/shared";
import z from "zod";

export const tripLinkParams = idParam.extend({
  linkId: z.string(),
});

export const createLink = z.strictObject({
  url: z.httpUrl(),
});
