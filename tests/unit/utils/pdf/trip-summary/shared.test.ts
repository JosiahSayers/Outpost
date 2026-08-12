import {
  contentWidth,
  currentFontMetrics,
  drawFieldRow,
  drawSectionHeading,
  ensureSpace,
  FIELD_ROW_HEIGHT,
  formatDayLabel,
  withContinuationHeader,
} from "$/utils/pdf/trip-summary/shared";
import { describe, expect, it, mock } from "bun:test";
import { makeTestDocument, pageCount } from "../../../../helpers/pdf";

describe("formatDayLabel", () => {
  it("returns just the day number when there's no date", () => {
    expect(formatDayLabel({ dayNumber: 3, date: null })).toBe("Day 3");
  });

  it("appends the formatted date, in UTC, when a date is present", () => {
    expect(
      formatDayLabel({
        dayNumber: 1,
        date: new Date("2026-08-14T00:00:00.000Z"),
      }),
    ).toBe("Day 1 — Fri, Aug 14");
  });
});

describe("contentWidth", () => {
  it("subtracts both margins from the page width", () => {
    const document = makeTestDocument();
    expect(contentWidth(document)).toBe(
      document.page.width -
        document.page.margins.left -
        document.page.margins.right,
    );
  });
});

describe("ensureSpace", () => {
  it("does not add a page when the needed height still fits", () => {
    const document = makeTestDocument();
    ensureSpace(document, 20);
    expect(pageCount(document)).toBe(1);
  });

  it("adds a page once the needed height would overflow the bottom margin", () => {
    const document = makeTestDocument();
    document.y =
      document.page.height - document.page.margins.bottom - 5;
    ensureSpace(document, 20);
    expect(pageCount(document)).toBe(2);
    expect(document.y).toBe(document.page.margins.top);
  });
});

describe("currentFontMetrics", () => {
  it("reflects the currently active font size", () => {
    const document = makeTestDocument();
    document.font("Source Sans 3").fontSize(14);
    expect(currentFontMetrics(document).fontSize).toBe(14);
  });

  it("returns positive ascender/capHeight font-unit values", () => {
    const document = makeTestDocument();
    document.font("Playfair Display Bold").fontSize(12);
    const metrics = currentFontMetrics(document);
    expect(metrics.ascender).toBeGreaterThan(0);
    expect(metrics.capHeight).toBeGreaterThan(0);
  });
});

describe("drawFieldRow", () => {
  it("advances document.y by exactly FIELD_ROW_HEIGHT", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawFieldRow(document, "Trail", "Wonderland Trail");
    expect(document.y).toBe(before + FIELD_ROW_HEIGHT);
  });
});

describe("drawSectionHeading", () => {
  it("does not add extra top margin for the first heading on a fresh page", () => {
    const document = makeTestDocument();
    expect(document.y).toBe(document.page.margins.top);
    drawSectionHeading(document, "Trip Details");
    const freshPageAdvance = document.y - document.page.margins.top;

    drawSectionHeading(document, "Tasks");
    const secondHeadingAdvance = document.y - (document.page.margins.top + freshPageAdvance);

    // The second heading, starting mid-page, gets an 18pt top margin the
    // first one (starting at the page's own top margin) doesn't.
    expect(secondHeadingAdvance).toBe(freshPageAdvance + 18);
  });

  it("does not add the extra top margin right after a page break either", () => {
    const document = makeTestDocument();
    drawSectionHeading(document, "Trip Details");
    const freshPageAdvance = document.y - document.page.margins.top;

    document.addPage();
    expect(document.y).toBe(document.page.margins.top);
    drawSectionHeading(document, "Tasks (continued)");
    const continuationAdvance = document.y - document.page.margins.top;

    expect(continuationAdvance).toBe(freshPageAdvance);
  });
});

describe("withContinuationHeader", () => {
  it("calls redraw once per page break that happens during draw", () => {
    const document = makeTestDocument();
    const redraw = mock(() => {});

    withContinuationHeader(
      document,
      redraw,
      () => {
        document.addPage();
        document.addPage();
      },
    );

    expect(redraw).toHaveBeenCalledTimes(2);
  });

  it("unregisters the listener once draw finishes", () => {
    const document = makeTestDocument();
    const redraw = mock(() => {});

    withContinuationHeader(document, redraw, () => {
      document.addPage();
    });
    expect(redraw).toHaveBeenCalledTimes(1);

    document.addPage();
    expect(redraw).toHaveBeenCalledTimes(1);
  });

  it("unregisters the listener even if draw throws", () => {
    const document = makeTestDocument();
    const redraw = mock(() => {});

    expect(() =>
      withContinuationHeader(document, redraw, () => {
        throw new Error("boom");
      }),
    ).toThrow("boom");

    document.addPage();
    expect(redraw).not.toHaveBeenCalled();
  });
});
