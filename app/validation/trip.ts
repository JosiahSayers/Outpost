import {
  FLUID_DEFAULT_UNIT,
  FluidUnit,
} from "$/frontend/shared-components/converter/fluid-conversions";
import {
  WEIGHT_DEFAULT_UNIT,
  WeightUnit,
} from "$/frontend/shared-components/converter/weight-conversions";
import {
  arrayQueryParam,
  isoDate,
  numberQueryParam,
} from "$/validation/shared";
import z from "zod";
import { TripStatus } from "../../generated/prisma/enums";

export const tripSearch = z.strictObject({
  take: numberQueryParam(3),
  skip: numberQueryParam(0),
});

const tripSummarySection = z.enum([
  "details",
  "tasks",
  "mealPlan",
  "packingList",
]);
const tripSummaryPrintStatus = z.enum(["carryover", "blank"]);

export const tripSummaryPdfQuery = z.strictObject({
  sections: arrayQueryParam(tripSummarySection, [
    "details",
    "tasks",
    "mealPlan",
    "packingList",
  ]),
  taskStatus: tripSummaryPrintStatus.default("carryover"),
  packingListStatus: tripSummaryPrintStatus.default("carryover"),
  // The unit to render water/weight values in. Resolved client-side (account
  // setting, falling back to a locale guess via navigator.language) and
  // passed in explicitly, since the server has no equivalent locale signal
  // to reproduce that fallback with.
  fluidUnit: z.enum(FluidUnit).default(FLUID_DEFAULT_UNIT),
  weightUnit: z.enum(WeightUnit).default(WEIGHT_DEFAULT_UNIT),
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

export const newTrip = withTripDateRange(
  baseNewTrip.extend({ start: isoDate, end: isoDate }),
);

export const editTrip = withTripDateRange(
  baseNewTrip.partial().extend({ start: isoDate, end: isoDate }),
);
