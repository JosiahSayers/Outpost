import type { tripSummaryPdfQuery } from "$/validation/trip";
import type { z } from "zod";

// Type-only import: the validation module pulls in Prisma's non-browser
// client and never ends up in the bundle, but its inferred query shape is
// still the single source of truth for what sections/statuses exist.
type TripSummaryPdfQuery = z.infer<typeof tripSummaryPdfQuery>;
export type TripSummarySection = TripSummaryPdfQuery["sections"][number];
export type TripSummaryPrintStatus = TripSummaryPdfQuery["taskStatus"];

export function buildTripSummaryPdfUrl(
  tripId: string,
  options: {
    sections: TripSummarySection[];
    taskStatus: TripSummaryPrintStatus;
    packingListStatus: TripSummaryPrintStatus;
  },
): string {
  const params = new URLSearchParams();
  options.sections.forEach((section) => params.append("sections", section));
  params.set("taskStatus", options.taskStatus);
  params.set("packingListStatus", options.packingListStatus);
  return `/api/trips/${tripId}/summary-pdf?${params}`;
}
