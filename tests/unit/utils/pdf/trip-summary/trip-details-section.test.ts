import {
  drawTripDetailsSection,
  drawTripMasthead,
  formatDateRange,
} from "$/utils/pdf/trip-summary/trip-details-section";
import { describe, expect, it } from "bun:test";
import { makeTestDocument, pageCount } from "../../../../helpers/pdf";

describe("formatDateRange", () => {
  it("returns 'Dates TBD' when neither date is set", () => {
    expect(formatDateRange(null, null)).toBe("Dates TBD");
  });

  it("formats just the start date when there's no end date", () => {
    expect(formatDateRange(new Date("2026-08-14T00:00:00.000Z"), null)).toBe(
      "Aug 14",
    );
  });

  it("formats just the end date when there's no start date", () => {
    expect(formatDateRange(null, new Date("2026-08-20T00:00:00.000Z"))).toBe(
      "Aug 20",
    );
  });

  it("formats a full range with the end year appended", () => {
    expect(
      formatDateRange(
        new Date("2026-08-14T00:00:00.000Z"),
        new Date("2026-08-20T00:00:00.000Z"),
      ),
    ).toBe("Aug 14 – Aug 20, 2026");
  });

  it("uses UTC so calendar-day dates aren't shifted by the local timezone", () => {
    // Midnight UTC on Jan 1 would read as Dec 31 in negative-offset zones if
    // this weren't pinned to UTC.
    expect(formatDateRange(new Date("2026-01-01T00:00:00.000Z"), null)).toBe(
      "Jan 1",
    );
  });
});

describe("drawTripMasthead", () => {
  it("renders the trip name without throwing", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTripMasthead(document, { name: "Wonderland Trail Loop" });
    expect(document.y).toBeGreaterThan(before);
    expect(pageCount(document)).toBe(1);
  });
});

describe("drawTripDetailsSection", () => {
  const baseTrip = {
    name: "Wonderland Trail Loop",
    trail: "Wonderland Trail",
    location: "Mount Rainier National Park, WA",
    start: new Date("2026-08-14T00:00:00.000Z"),
    end: new Date("2026-08-20T00:00:00.000Z"),
    status: "planning" as const,
  };

  it("renders a fully-populated trip without throwing", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTripDetailsSection(document, baseTrip);
    expect(document.y).toBeGreaterThan(before);
    expect(pageCount(document)).toBe(1);
  });

  it("falls back to an em dash for missing trail/location instead of throwing", () => {
    const document = makeTestDocument();
    expect(() =>
      drawTripDetailsSection(document, {
        ...baseTrip,
        trail: null,
        location: null,
        start: null,
        end: null,
      }),
    ).not.toThrow();
    expect(pageCount(document)).toBe(1);
  });

  it("renders every trip status without throwing", () => {
    const statuses = [
      "planning",
      "in_progress",
      "postponed",
      "finished",
      "cancelled",
    ] as const;

    for (const status of statuses) {
      const document = makeTestDocument();
      expect(() =>
        drawTripDetailsSection(document, { ...baseTrip, status }),
      ).not.toThrow();
    }
  });
});
