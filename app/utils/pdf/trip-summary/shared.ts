// Shared layout constants and drawing helpers for the trip summary PDF
// (BTP-78). Every section-drawing function here takes an already-open
// PDFDocument and draws starting at its current document.y — it never
// creates, pipes, or ends the document itself, and never draws the logo.
// That's all owned by the assembler so sections can flow continuously
// across a single combined document regardless of which ones are selected.

// Pure data (no React), safe to import server-side — app/validation/
// account-settings.ts already does the same for this module.
import {
  FLUID_CONVERSIONS,
  FLUID_UNIT_ABBREVIATION,
  type FluidUnit,
} from "$/frontend/shared-components/converter/fluid-conversions";

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

// No `navigator` on the server, so number formatting is pinned to en-US —
// same reasoning as formatDayLabel below pinning its Intl.DateTimeFormat.
// Mirrors app/frontend/utils/hooks/unit-conversion/use-fluid-display.ts's
// conversion math so a PDF's water values match what the user sees on
// screen for their liquid_viewing_unit account setting.
export function formatFluidMl(ml: number, unit: FluidUnit): string {
  const value = ml / FLUID_CONVERSIONS.multipliers[unit];
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${FLUID_UNIT_ABBREVIATION[unit]}`;
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
export const FIELD_LABEL_GAP = 14;
export const FIELD_ROW_HEIGHT = 16;

export interface FieldRowOptions {
  x?: number;
  width?: number;
  labelWidth?: number;
  labelFontSize?: number;
}

const FIELD_LABEL_SIZE = 9;

// Draws one label/value row at an explicit y, within `options.x`/`width`
// (defaulting to the full content area at the left margin). Unlike a
// document.y-driven helper, this lets a caller lay out independent
// columns — e.g. trip details next to safety info — that each need their
// own running y, since document.y is a single cursor shared by the whole
// document. Returns the y immediately below the row so calls can chain.
export function drawFieldRow(
  document: PDFKit.PDFDocument,
  y: number,
  label: string,
  value: string,
  options: FieldRowOptions = {},
): number {
  const x = options.x ?? document.page.margins.left;
  const labelWidth = options.labelWidth ?? FIELD_LABEL_WIDTH;
  const width = options.width ?? contentWidth(document);

  document
    .font("Source Sans 3 SemiBold")
    .fontSize(options.labelFontSize ?? FIELD_LABEL_SIZE)
    .fillColor([100, 100, 100])
    .text(label, x, y, { width: labelWidth });
  document
    .font("Source Sans 3")
    .fontSize(10)
    .fillColor("black")
    .text(value, x + labelWidth + FIELD_LABEL_GAP, y, {
      width: width - labelWidth - FIELD_LABEL_GAP,
    });
  return y + FIELD_ROW_HEIGHT;
}

// Sized above FIELD_LABEL_SIZE (the "Emergency Contact"/"Depart" fields it
// groups) so it reads as a heading over them, not another field of the
// same rank. Exported so row labels that open their own group — "Party",
// "Vehicle" — can match it instead of the plain field-label size.
export const MINI_HEADING_SIZE = 10;
export const MINI_HEADING_HEIGHT = 18;

// A small sub-heading within a section (e.g. "Who to call"), not a full
// drawSectionHeading — no rule, no page-break allowance of its own.
export function drawMiniHeading(
  document: PDFKit.PDFDocument,
  y: number,
  title: string,
  x: number,
): number {
  document
    .font("Source Sans 3 SemiBold")
    .fontSize(MINI_HEADING_SIZE)
    .fillColor([100, 100, 100])
    .text(title.toUpperCase(), x, y, { characterSpacing: 0.3 });
  return y + MINI_HEADING_HEIGHT;
}

export const STACKED_FIELD_HEIGHT = 28;
const STACKED_FIELD_VALUE_GAP = 12;
const STACKED_FIELD_VALUE_INDENT = 8;

// Label-above-value variant of drawFieldRow, for labels too long to sit
// beside a value in a half-width column (e.g. "Closest Ranger Station").
// The value indents slightly under its label, echoing drawFieldRow's
// label/value relationship even though they're stacked instead of inline.
export function drawStackedField(
  document: PDFKit.PDFDocument,
  y: number,
  label: string,
  value: string,
  x: number,
  width: number,
): number {
  document
    .font("Source Sans 3 SemiBold")
    .fontSize(9)
    .fillColor([100, 100, 100])
    .text(label, x, y, { width });
  document
    .font("Source Sans 3")
    .fontSize(10)
    .fillColor("black")
    .text(value, x + STACKED_FIELD_VALUE_INDENT, y + STACKED_FIELD_VALUE_GAP, {
      width: width - STACKED_FIELD_VALUE_INDENT,
    });
  return y + STACKED_FIELD_HEIGHT;
}
