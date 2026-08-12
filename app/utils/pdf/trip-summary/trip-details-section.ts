import type { Trip } from "../../../../generated/prisma/client";
import { LOGO_RESERVED_WIDTH, contentWidth, drawFieldRow, drawSectionHeading } from "./shared";

export type TripDetailsSectionInput = Pick<
  Trip,
  "name" | "trail" | "location" | "start" | "end" | "status"
>;

// Mirrors app/frontend/dashboard/trip-card.tsx's STATUS_LABEL — kept as a
// separate copy rather than a cross-boundary import since that file lives
// under app/frontend/ and is bundled for the browser, not the server.
const STATUS_LABEL: Record<Trip["status"], string> = {
  planning: "Planning",
  in_progress: "In Progress",
  postponed: "Postponed",
  finished: "Completed",
  cancelled: "Cancelled",
};

// Mirrors app/frontend/dashboard/trip-card.tsx's formatDateRange,
// reimplemented server-side since that helper reads `navigator.language`
// (browser-only). Trip dates are calendar days, not instants, so formatting
// stays in UTC (the timezone they're stored in) rather than any local offset.
function formatDateRange(start: Date | null, end: Date | null): string {
  if (!start && !end) return "Dates TBD";

  const fmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });

  if (!start || !end) {
    return fmt.format((start ?? end)!);
  }

  return `${fmt.format(start)} – ${fmt.format(end)}, ${end.getUTCFullYear()}`;
}

// Drawn once at the top of the document regardless of which sections are
// selected, so even a lone Packing List export still says whose trip it is.
export function drawTripMasthead(
  document: PDFKit.PDFDocument,
  trip: Pick<TripDetailsSectionInput, "name">,
): void {
  document
    .font("Playfair Display Black")
    .fontSize(20)
    .fillColor("black")
    .text(trip.name, document.page.margins.left, document.y, {
      width: contentWidth(document) - LOGO_RESERVED_WIDTH,
    });
  document.y += 6;
}

export function drawTripDetailsSection(
  document: PDFKit.PDFDocument,
  trip: TripDetailsSectionInput,
): void {
  drawSectionHeading(document, "Trip Details");

  drawFieldRow(document, "Trail", trip.trail ?? "—");
  drawFieldRow(document, "Location", trip.location ?? "—");
  drawFieldRow(document, "Dates", formatDateRange(trip.start, trip.end));
  drawFieldRow(document, "Status", STATUS_LABEL[trip.status]);
}
