import { idParam } from "$/validation/shared";
import z from "zod";

export const tripLinkParams = idParam.extend({
  linkId: z.string(),
});

export const createLink = z.strictObject({
  url: z.httpUrl(),
});

// Not yet wired to a route — the PATCH endpoint that will use this to let
// users fill in a title/description the Open Graph fetch couldn't find is
// separate follow-up work. Defined now so the frontend mutation has a
// shared contract to type against ahead of that.
export const editLink = z
  .strictObject({
    name: z.string().trim(),
    description: z.string().trim(),
  })
  .partial();
