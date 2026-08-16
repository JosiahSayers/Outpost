import type { ClientTripPartyMember } from "$/transformers/trip-party-member";
import type { Trip, TripSafetyInfo } from "../../../../generated/prisma/client";
import {
  FIELD_LABEL_GAP,
  FIELD_ROW_HEIGHT,
  LOGO_RESERVED_WIDTH,
  MINI_HEADING_HEIGHT,
  MINI_HEADING_SIZE,
  STACKED_FIELD_HEIGHT,
  contentWidth,
  drawFieldRow,
  drawMiniHeading,
  drawNote,
  drawSectionHeading,
  drawStackedField,
  ensureSpace,
} from "./shared";

export type TripDetailsSectionInput = Pick<
  Trip,
  "name" | "trail" | "location" | "start" | "end" | "status"
> & {
  safetyInfo: TripSafetyInfo | null;
  partyMembers: ClientTripPartyMember[];
};

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
export function formatDateRange(start: Date | null, end: Date | null): string {
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

// Mirrors app/frontend/trip/safety-info/time-field.tsx's formatTime,
// reimplemented server-side since expectedDepartureTime/expectedReturnTime
// are stored as raw "HH:mm" strings with no browser-only formatting needed,
// just kept here so this file doesn't reach into app/frontend.
function formatSafetyTime(value: string | null): string | null {
  if (!value) return null;
  const [hoursPart, minutesPart] = value.split(":");
  const hours = Number(hoursPart);
  const minutes = Number(minutesPart);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;
  const period = hours >= 12 ? "PM" : "AM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function joinNamePhone(name: string | null, phone: string | null): string {
  return [name, phone].filter(Boolean).join(" · ") || "—";
}

function formatSingleDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

// Mirrors app/frontend/trip/safety-info/index.tsx, which appends the trip's
// start/end date next to Depart/Return so the time isn't ambiguous on its
// own — a mid-morning trip and an overnight one both just say "8:00 AM"
// otherwise.
function withDate(time: string, date: Date | null): string {
  return date ? `${time}, ${formatSingleDate(date)}` : time;
}

// A couple hours late off-trail isn't an emergency — the next morning is a
// clearer, calmer threshold than an arbitrary hour count, and doesn't need
// the reader to do time-zone-free arithmetic under stress. Falls back to a
// dateless phrasing when the trip has no end date to anchor it to.
function nextMorningPhrase(tripEnd: Date | null): string {
  if (!tripEnd) return "the next morning";
  const nextDay = new Date(tripEnd);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return `the morning of ${formatSingleDate(nextDay)}`;
}

// Emergency Contact isn't who you call if the party doesn't come back —
// that's the ranger station's job. Falls back to whichever half of the
// name/phone pair is on file, or a generic phrase when neither is.
function rangerStationPhrase(safety: TripSafetyInfo | null): string {
  const name = safety?.rangerStationName?.trim() || null;
  const phone = safety?.rangerStationPhone?.trim() || null;
  if (name && phone) return `${name} at ${phone}`;
  if (name) return name;
  if (phone) return phone;
  return "the closest ranger station";
}

// The Return field above this already states the expected time, so this
// only adds the part that isn't a fact about the trip: what to do about it.
export function buildReturnByNote(
  tripEnd: Date | null,
  safety: TripSafetyInfo | null,
): string {
  return `If not returned by ${nextMorningPhrase(tripEnd)}, call ${rangerStationPhrase(safety)}.`;
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

const COLUMN_GAP = 24;
// Extra gap above "The plan" heading when it follows "Who to call" content,
// so the two mini-sections read as visually distinct groups rather than
// one heading crowding directly against the block above it.
const PLAN_TOP_MARGIN = 10;
const NOTE_TOP_MARGIN = 6;
// Gap above Party, separating the tail rows from the split columns above —
// otherwise Party crowds directly against whichever column (left or right)
// ran longer.
const PARTY_TOP_MARGIN = 12;
// The "If not returned by…" note is 1-2 wrapped lines depending on the
// ranger station name's length; ensureSpace just needs a safe upper bound,
// the actual draw measures its real height via drawNote/heightOfString.
const ESTIMATED_NOTE_HEIGHT = 34;

function estimateSplitHeight(flags: {
  hasWhoToCall: boolean;
  hasContact: boolean;
  hasRanger: boolean;
  hasPlan: boolean;
}): number {
  const leftHeight = FIELD_ROW_HEIGHT * 4;

  let rightHeight = 0;
  if (flags.hasWhoToCall) {
    rightHeight += MINI_HEADING_HEIGHT;
    if (flags.hasContact) rightHeight += STACKED_FIELD_HEIGHT;
    if (flags.hasRanger) rightHeight += STACKED_FIELD_HEIGHT;
  }
  if (flags.hasPlan) {
    if (flags.hasWhoToCall) rightHeight += PLAN_TOP_MARGIN;
    // The "if not returned" note always accompanies The Plan now — its
    // fallbacks (dateless phrasing, generic ranger phrase) mean it never
    // needs a specific field to be set, just the heading above it.
    rightHeight +=
      MINI_HEADING_HEIGHT +
      NOTE_TOP_MARGIN +
      ESTIMATED_NOTE_HEIGHT +
      FIELD_ROW_HEIGHT * 2;
  }

  return Math.max(leftHeight, rightHeight);
}

// Draws Trail/Location/Dates/Status either full-width (no safety info to
// show alongside them) or in a left column next to a "Who to call"/"The
// plan" right column, filling the width that would otherwise sit empty.
function drawDetailsAndSafetyColumns(
  document: PDFKit.PDFDocument,
  trip: TripDetailsSectionInput,
): number {
  const safety = trip.safetyInfo;
  const hasContact = Boolean(
    safety?.emergencyContactName || safety?.emergencyContactPhone,
  );
  const hasRanger = Boolean(
    safety?.rangerStationName || safety?.rangerStationPhone,
  );
  const hasWhoToCall = hasContact || hasRanger;
  const departTime = formatSafetyTime(safety?.expectedDepartureTime ?? null);
  const returnTime = formatSafetyTime(safety?.expectedReturnTime ?? null);
  const hasPlan = Boolean(departTime || returnTime);
  const hasSafetyColumn = hasWhoToCall || hasPlan;

  const fullWidth = contentWidth(document);
  const startX = document.page.margins.left;

  if (!hasSafetyColumn) {
    ensureSpace(document, FIELD_ROW_HEIGHT * 4);
    let y = document.y;
    y = drawFieldRow(document, y, "Trail", trip.trail ?? "—");
    y = drawFieldRow(document, y, "Location", trip.location ?? "—");
    y = drawFieldRow(
      document,
      y,
      "Dates",
      formatDateRange(trip.start, trip.end),
    );
    y = drawFieldRow(document, y, "Status", STATUS_LABEL[trip.status]);
    return y;
  }

  ensureSpace(
    document,
    estimateSplitHeight({ hasWhoToCall, hasContact, hasRanger, hasPlan }),
  );

  const columnWidth = (fullWidth - COLUMN_GAP) / 2;
  const rightX = startX + columnWidth + COLUMN_GAP;
  const startY = document.y;

  let leftY = startY;
  const leftOptions = { width: columnWidth, labelWidth: 66 };
  leftY = drawFieldRow(
    document,
    leftY,
    "Trail",
    trip.trail ?? "—",
    leftOptions,
  );
  leftY = drawFieldRow(
    document,
    leftY,
    "Location",
    trip.location ?? "—",
    leftOptions,
  );
  leftY = drawFieldRow(
    document,
    leftY,
    "Dates",
    formatDateRange(trip.start, trip.end),
    leftOptions,
  );
  leftY = drawFieldRow(
    document,
    leftY,
    "Status",
    STATUS_LABEL[trip.status],
    leftOptions,
  );

  let rightY = startY;
  if (hasWhoToCall) {
    rightY = drawMiniHeading(document, rightY, "Who to call", rightX);
    if (hasContact && safety) {
      rightY = drawStackedField(
        document,
        rightY,
        "Emergency Contact",
        joinNamePhone(
          safety.emergencyContactName,
          safety.emergencyContactPhone,
        ),
        rightX,
        columnWidth,
      );
    }
    if (hasRanger && safety) {
      rightY = drawStackedField(
        document,
        rightY,
        "Closest Ranger Station",
        joinNamePhone(safety.rangerStationName, safety.rangerStationPhone),
        rightX,
        columnWidth,
      );
    }
  }
  if (hasPlan) {
    if (hasWhoToCall) rightY += PLAN_TOP_MARGIN;
    rightY = drawMiniHeading(document, rightY, "The plan", rightX);
    // Always shown alongside The Plan — buildReturnByNote already falls
    // back to dateless/generic phrasing, so it doesn't need departTime or
    // returnTime specifically to say something useful.
    rightY = drawNote(
      document,
      rightY,
      rightX,
      columnWidth,
      buildReturnByNote(trip.end, safety),
      { icon: true },
    );
    rightY += NOTE_TOP_MARGIN;
    const planOptions = { x: rightX, width: columnWidth, labelWidth: 46 };
    if (departTime) {
      rightY = drawFieldRow(
        document,
        rightY,
        "Depart",
        withDate(departTime, trip.start),
        planOptions,
      );
    }
    if (returnTime) {
      rightY = drawFieldRow(
        document,
        rightY,
        "Return",
        withDate(returnTime, trip.end),
        planOptions,
      );
    }
  }

  return Math.max(leftY, rightY);
}

const PARTY_NAME_SIZE = 10;
const PARTY_PHONE_SIZE = 8.5;
const PARTY_NAME_LINE_HEIGHT = 12;
const PARTY_PHONE_LINE_HEIGHT = 10;
const PARTY_GAP_X = 18;
const PARTY_GAP_Y = 4;
const PARTY_BOTTOM_MARGIN = 8;

// Shared by Party, Vehicle, and Medical so their values all line up on the
// same left edge, even though Vehicle also shares its row with Permit.
// Wide enough for "Party" and "Vehicle" at MINI_HEADING_SIZE (see below).
const TAIL_LABEL_WIDTH = 66;

// Lays out party members left-to-right, wrapping to a new line when the
// next block would overflow — pdfkit has no flex-wrap primitive, so this
// walks members manually, measuring each name/phone before placing it.
// Each member takes one or two lines (phone only prints when present),
// which is exactly why this can't just be another drawFieldRow: rows there
// assume a single line of text.
function drawPartyMembers(
  document: PDFKit.PDFDocument,
  members: ClientTripPartyMember[],
  x: number,
  y: number,
  width: number,
): number {
  if (members.length === 0) {
    document
      .font("Source Sans 3")
      .fontSize(10)
      .fillColor("black")
      .text("—", x, y);
    return y + FIELD_ROW_HEIGHT;
  }

  let cursorX = x;
  let cursorY = y;
  let rowHeight = 0;

  for (const member of members) {
    const name = member.name ?? "—";
    document.font("Source Sans 3").fontSize(PARTY_NAME_SIZE);
    const nameWidth = document.widthOfString(name);
    let phoneWidth = 0;
    if (member.phone) {
      document.font("Source Sans 3").fontSize(PARTY_PHONE_SIZE);
      phoneWidth = document.widthOfString(member.phone);
    }
    const blockWidth = Math.max(nameWidth, phoneWidth);

    if (cursorX !== x && cursorX + blockWidth > x + width) {
      cursorX = x;
      cursorY += rowHeight + PARTY_GAP_Y;
      rowHeight = 0;
    }

    document
      .font("Source Sans 3")
      .fontSize(PARTY_NAME_SIZE)
      .fillColor("black")
      .text(name, cursorX, cursorY, { width });

    let blockHeight = PARTY_NAME_LINE_HEIGHT;
    if (member.phone) {
      document
        .font("Source Sans 3")
        .fontSize(PARTY_PHONE_SIZE)
        .fillColor([100, 100, 100])
        .text(member.phone, cursorX, cursorY + PARTY_NAME_LINE_HEIGHT, {
          width,
        });
      blockHeight += PARTY_PHONE_LINE_HEIGHT;
    }

    rowHeight = Math.max(rowHeight, blockHeight);
    cursorX += blockWidth + PARTY_GAP_X;
  }

  // pdfkit's fillColor is document-global and persists across draw calls —
  // a member with a phone number leaves it gray (the phone's color), which
  // would otherwise leak into whatever draws next (e.g. the first task's
  // checkbox fill, if it happens to be checked).
  document.fillColor("black");
  return cursorY + rowHeight;
}

function drawPartyRow(
  document: PDFKit.PDFDocument,
  y: number,
  members: ClientTripPartyMember[],
  x: number,
  width: number,
): number {
  // Sized like a mini heading (MINI_HEADING_SIZE), not a plain field label —
  // Party opens a group of its own rather than naming a single value.
  document
    .font("Source Sans 3 SemiBold")
    .fontSize(MINI_HEADING_SIZE)
    .fillColor([100, 100, 100])
    .text(`Party (${members.length})`, x, y, { width: TAIL_LABEL_WIDTH });

  const bottomY = drawPartyMembers(
    document,
    members,
    x + TAIL_LABEL_WIDTH + FIELD_LABEL_GAP,
    y,
    width - TAIL_LABEL_WIDTH - FIELD_LABEL_GAP,
  );
  return bottomY + PARTY_BOTTOM_MARGIN;
}

// Party is always shown (every trip has at least one member — the owner).
// Vehicle/Permit and Medical only draw when there's something to show, so
// a trip with no safety info filled in yet doesn't print a wall of dashes.
function drawSafetyTailRows(
  document: PDFKit.PDFDocument,
  safety: TripSafetyInfo | null,
  partyMembers: ClientTripPartyMember[],
): number {
  const fullWidth = contentWidth(document);
  const startX = document.page.margins.left;

  ensureSpace(document, PARTY_TOP_MARGIN + FIELD_ROW_HEIGHT * 3);
  let y = drawPartyRow(
    document,
    document.y + PARTY_TOP_MARGIN,
    partyMembers,
    startX,
    fullWidth,
  );

  const hasVehicle = Boolean(safety?.vehicleDescription);
  const hasPermit = Boolean(safety?.permitOrRouteNumber);
  if (hasVehicle || hasPermit) {
    ensureSpace(document, FIELD_ROW_HEIGHT);
    const half = (fullWidth - COLUMN_GAP) / 2;
    // Vehicle, like Party, gets the mini-heading size — it anchors this row
    // the way Party anchors its own, even though Permit beside it doesn't.
    const vehicleY = drawFieldRow(
      document,
      y,
      "Vehicle",
      safety?.vehicleDescription ?? "—",
      {
        x: startX,
        width: half,
        labelWidth: TAIL_LABEL_WIDTH,
        labelFontSize: MINI_HEADING_SIZE,
      },
    );
    const permitY = drawFieldRow(
      document,
      y,
      "Permit",
      safety?.permitOrRouteNumber ?? "—",
      { x: startX + half + COLUMN_GAP, width: half, labelWidth: 44 },
    );
    y = Math.max(vehicleY, permitY);
  }

  if (safety?.medicalNotes) {
    ensureSpace(document, FIELD_ROW_HEIGHT);
    y = drawFieldRow(document, y, "Medical", safety.medicalNotes, {
      labelWidth: TAIL_LABEL_WIDTH,
    });
  }

  return y;
}

export function drawTripDetailsSection(
  document: PDFKit.PDFDocument,
  trip: TripDetailsSectionInput,
): void {
  drawSectionHeading(document, "Trip Details");

  document.y = drawDetailsAndSafetyColumns(document, trip);
  document.y = drawSafetyTailRows(document, trip.safetyInfo, trip.partyMembers);
}
