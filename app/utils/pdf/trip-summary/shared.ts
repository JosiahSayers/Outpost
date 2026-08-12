// Shared layout constants and drawing helpers for the trip summary PDF
// (BTP-78). Every section-drawing function here takes an already-open
// PDFDocument and draws starting at its current document.y — it never
// creates, pipes, or ends the document itself, and never draws the logo.
// That's all owned by the assembler so sections can flow continuously
// across a single combined document regardless of which ones are selected.

// Matches the logo's own footprint in packing-list-generator.ts (height 22,
// aspect ratio 430/107) plus a little breathing room, so section titles
// never run under it in the top-right margin.
export const LOGO_RESERVED_WIDTH = 100;

export function contentWidth(document: PDFKit.PDFDocument): number {
  return (
    document.page.width -
    document.page.margins.left -
    document.page.margins.right
  );
}

// Shared by Meal Plan and the packing list's Food category, since both are
// grouped by day.
export function formatDayLabel(day: {
  dayNumber: number;
  date: Date | null;
}): string {
  const base = `Day ${day.dayNumber}`;
  if (!day.date) return base;
  const formatted = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(day.date);
  return `${base} — ${formatted}`;
}

// pdfkit only auto-paginates for flowing-mode text (no explicit x/y). Every
// drawing helper here positions explicitly (matching the existing packing
// list generator's approach), so each one must check for overflow itself
// and add a page before drawing — otherwise content just runs silently off
// the bottom of the page. addPage() resets document.y to the top margin and
// fires the 'pageAdded' event the assembler uses to redraw the logo.
export function ensureSpace(
  document: PDFKit.PDFDocument,
  neededHeight: number,
): void {
  if (
    document.y + neededHeight >
    document.page.height - document.page.margins.bottom
  ) {
    document.addPage();
  }
}

// pdfkit doesn't expose the active font's metrics publicly; read them off
// its private fields, same as packing-list-generator.ts's local helper of
// the same shape.
export function currentFontMetrics(document: PDFKit.PDFDocument): {
  ascender: number;
  capHeight: number;
  fontSize: number;
} {
  const internal = document as unknown as {
    _font: { ascender: number; capHeight: number };
    _fontSize: number;
  };
  return {
    ascender: internal._font.ascender,
    capHeight: internal._font.capHeight,
    fontSize: internal._fontSize,
  };
}

// A page break mid-section leaves the new page with zero context — no
// section title, no sub-group label, nothing telling the reader what they
// flipped to. While `draw` runs, `redraw` fires on every page break (in
// addition to the assembler's own logo redraw, since pdfkit emits
// 'pageAdded' to every registered listener) so the new page always opens
// with whatever heading is currently active.
export function withContinuationHeader(
  document: PDFKit.PDFDocument,
  redraw: () => void,
  draw: () => void,
): void {
  document.on("pageAdded", redraw);
  try {
    draw();
  } finally {
    document.off("pageAdded", redraw);
  }
}

const SECTION_HEADING_HEIGHT = 26;
// Gap above a section heading, separating it from whatever content the
// previous section (or the masthead) left behind. Skipped when document.y is
// still sitting exactly at the page's top margin — true only right after
// addPage() — so a continuation header redrawn via the 'pageAdded' listener
// doesn't get a redundant gap on top of the page margin it already has.
const SECTION_TOP_MARGIN = 18;

export function drawSectionHeading(
  document: PDFKit.PDFDocument,
  title: string,
): void {
  if (document.y > document.page.margins.top) {
    document.y += SECTION_TOP_MARGIN;
  }
  ensureSpace(document, SECTION_HEADING_HEIGHT);

  document
    .font("Playfair Display Bold")
    .fontSize(12)
    .fillColor("black")
    .text(title.toUpperCase(), document.page.margins.left, document.y, {
      characterSpacing: 0.4,
      width: contentWidth(document),
    });

  const ruleY = document.y + 2;
  document
    .moveTo(document.page.margins.left, ruleY)
    .lineTo(document.page.width - document.page.margins.right, ruleY)
    .lineWidth(1.25)
    .stroke();
  document.y = ruleY + 10;
}

const FIELD_LABEL_WIDTH = 90;
const FIELD_LABEL_GAP = 14;
export const FIELD_ROW_HEIGHT = 16;

export function drawFieldRow(
  document: PDFKit.PDFDocument,
  label: string,
  value: string,
): void {
  ensureSpace(document, FIELD_ROW_HEIGHT);
  const rowY = document.y;
  document
    .font("Source Sans 3 SemiBold")
    .fontSize(9)
    .fillColor([100, 100, 100])
    .text(label, document.page.margins.left, rowY, {
      width: FIELD_LABEL_WIDTH,
    });
  document
    .font("Source Sans 3")
    .fontSize(10)
    .fillColor("black")
    .text(
      value,
      document.page.margins.left + FIELD_LABEL_WIDTH + FIELD_LABEL_GAP,
      rowY,
      { width: contentWidth(document) - FIELD_LABEL_WIDTH - FIELD_LABEL_GAP },
    );
  document.y = rowY + FIELD_ROW_HEIGHT;
}
