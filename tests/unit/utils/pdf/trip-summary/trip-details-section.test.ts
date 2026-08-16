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
    safetyInfo: null,
    partyMembers: [
      { id: "pm-1", name: "Josiah Sayers", phone: null, userId: "u-1" },
    ],
  };

  const fullSafetyInfo = {
    id: "safety-1",
    tripId: "trip-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    emergencyContactName: "Jane Doe",
    emergencyContactPhone: "(555) 010-2938",
    rangerStationName: "Longmire Wilderness Information Center",
    rangerStationPhone: "(360) 569-6575",
    expectedDepartureTime: "07:00",
    expectedReturnTime: "17:00",
    vehicleDescription: "Blue Subaru Outback, WA 7EFG123",
    permitOrRouteNumber: "WT-2026-0442",
    medicalNotes: "Jane is allergic to bee stings; carries an EpiPen.",
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

  it("skips the safety column entirely when there's no safety info", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawTripDetailsSection(document, { ...baseTrip, safetyInfo: null });
    // Still just the base fields + the always-present Party row.
    expect(document.y).toBeGreaterThan(before);
    expect(pageCount(document)).toBe(1);
  });

  it("renders a fully-populated safety info and party list without throwing", () => {
    const document = makeTestDocument();
    expect(() =>
      drawTripDetailsSection(document, {
        ...baseTrip,
        safetyInfo: fullSafetyInfo,
        partyMembers: [
          {
            id: "pm-1",
            name: "Josiah Sayers",
            phone: "(555) 010-2938",
            userId: "u-1",
          },
          {
            id: "pm-2",
            name: "Jane Doe",
            phone: "(555) 044-7712",
            userId: null,
          },
          { id: "pm-3", name: "Alex Kim", phone: null, userId: null },
        ],
      }),
    ).not.toThrow();
    expect(pageCount(document)).toBe(1);
  });

  it("renders each safety sub-section independently when only some fields are set", () => {
    const partialCases = [
      { emergencyContactName: null, emergencyContactPhone: null },
      { rangerStationName: null, rangerStationPhone: null },
      { expectedDepartureTime: null, expectedReturnTime: null },
      { vehicleDescription: null, permitOrRouteNumber: null },
      { medicalNotes: null },
      // Only one side of a pair set, not both.
      { emergencyContactPhone: null },
      { expectedReturnTime: null },
    ];

    for (const overrides of partialCases) {
      const document = makeTestDocument();
      expect(() =>
        drawTripDetailsSection(document, {
          ...baseTrip,
          safetyInfo: { ...fullSafetyInfo, ...overrides },
        }),
      ).not.toThrow();
    }
  });

  it("always shows the Party row, with a count, even with no safety info", () => {
    const document = makeTestDocument();
    expect(() =>
      drawTripDetailsSection(document, {
        ...baseTrip,
        safetyInfo: null,
        partyMembers: [],
      }),
    ).not.toThrow();
    expect(pageCount(document)).toBe(1);
  });

  it("wraps a large party roster without throwing, mixing members with and without phones", () => {
    const document = makeTestDocument();
    const party = Array.from({ length: 8 }, (_, i) => ({
      id: `pm-${i}`,
      name: `Party Member With A Fairly Long Name ${i}`,
      phone: i % 2 === 0 ? "(555) 000-0000" : null,
      userId: null,
    }));

    expect(() =>
      drawTripDetailsSection(document, {
        ...baseTrip,
        safetyInfo: fullSafetyInfo,
        partyMembers: party,
      }),
    ).not.toThrow();
  });
});
