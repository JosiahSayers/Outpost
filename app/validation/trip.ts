import { numberQueryParam } from "$/validation/shared";
import z from "zod";
import { TripStatus } from "../../generated/prisma/enums";

export const tripSearch = z.strictObject({
  take: numberQueryParam(3),
  skip: numberQueryParam(0),
});

export const newTrip = z.strictObject({
  name: z.string().trim(),
  status: z.enum(TripStatus).optional(),
  trail: z.string().trim().optional(),
  location: z.string().trim().optional(),
  start: z.coerce.date({ error: "Invalid date" }).optional(),
  end: z.coerce.date({ error: "Invalid date" }).optional(),
});
