import { numberQueryParam } from "$/validation/shared";
import z from "zod";
import { TripStatus } from "../../generated/prisma/enums";

export const tripSearch = z.strictObject({
  take: numberQueryParam(3),
  skip: numberQueryParam(0),
});

export function withTripDateRange<
  T extends z.ZodType<{
    start?: Date | string | null;
    end?: Date | string | null;
  }>,
>(schema: T) {
  return schema.refine(
    (data) => !data.start || !data.end || data.start <= data.end,
    { error: "End date must be on or after the start date", path: ["end"] },
  );
}

export const baseNewTrip = z.strictObject({
  name: z.string().trim().min(1, { error: "Name is required" }),
  status: z.enum(TripStatus).optional(),
  trail: z.string().trim().optional(),
  location: z.string().trim().optional(),
});

// Prisma's own request validation rejects a bare "YYYY-MM-DD" string for a
// DateTime field ("Expected ISO-8601 DateTime"), so the validated date string
// is converted to a `Date` here rather than passed through as-is.
const tripDate = z.iso
  .date({ error: "Invalid date" })
  .nullish()
  .transform((value) => (value == null ? value : new Date(value)));

export const newTrip = withTripDateRange(
  baseNewTrip.extend({ start: tripDate, end: tripDate }),
);

export const editTrip = withTripDateRange(
  baseNewTrip.partial().extend({ start: tripDate, end: tripDate }),
);
