import type { MealName } from "../../../../generated/prisma/client";
import {
  contentWidth,
  drawSectionHeading,
  ensureSpace,
  formatDayLabel,
  withContinuationHeader,
} from "./shared";

export interface MealPlanSectionItem {
  meal: MealName;
  name: string;
  quantity: number;
  // Null means no value has been entered. 0 is a real value ("doesn't need
  // water") and is never flagged — only null counts as missing.
  waterMl: number | null;
}

export interface MealPlanSectionDay {
  dayNumber: number;
  date: Date | null;
  items: MealPlanSectionItem[];
}

const MEAL_ORDER: MealName[] = ["breakfast", "lunch", "dinner", "snacks"];
const MEAL_LABEL: Record<MealName, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

function groupByMeal(
  items: MealPlanSectionItem[],
): Array<{ meal: MealName; items: MealPlanSectionItem[] }> {
  return MEAL_ORDER.map((meal) => ({
    meal,
    items: items.filter((item) => item.meal === meal),
  })).filter((group) => group.items.length > 0);
}

// A single item's total water is its per-unit value times how many of it
// are planned for that meal — null propagates (an unknown per-unit value
// makes the row's total unknown too, regardless of quantity).
function itemWaterTotal(item: MealPlanSectionItem): number | null {
  return item.waterMl === null ? null : item.waterMl * item.quantity;
}

function sumWater(items: MealPlanSectionItem[]): {
  totalMl: number;
  missingCount: number;
} {
  let totalMl = 0;
  let missingCount = 0;
  for (const item of items) {
    const water = itemWaterTotal(item);
    if (water === null) missingCount += 1;
    else totalMl += water;
  }
  return { totalMl, missingCount };
}

function formatWaterSummary(items: MealPlanSectionItem[]): string {
  const { totalMl, missingCount } = sumWater(items);
  if (missingCount === items.length) return "no value";
  return missingCount > 0
    ? `${totalMl} ml · ${missingCount} missing`
    : `${totalMl} ml`;
}

const DAY_HEADER_HEIGHT = 20;

function drawDayHeader(
  document: PDFKit.PDFDocument,
  day: MealPlanSectionDay,
  continued: boolean,
) {
  ensureSpace(document, DAY_HEADER_HEIGHT);
  const rowY = document.y;
  const label = formatDayLabel(day) + (continued ? " (continued)" : "");
  const { missingCount } = sumWater(day.items);

  document
    .font("Source Sans 3 SemiBold")
    .fontSize(10)
    .fillColor("black")
    .text(label, document.page.margins.left, rowY, {
      width: contentWidth(document) - 130,
    });

  document
    .font(missingCount > 0 ? "Source Sans 3 SemiBold" : "Source Sans 3")
    .fontSize(8)
    .fillColor([100, 100, 100])
    .text(formatWaterSummary(day.items), document.page.margins.left, rowY, {
      width: contentWidth(document),
      align: "right",
    });

  const ruleY = rowY + 13;
  document
    .moveTo(document.page.margins.left, ruleY)
    .lineTo(document.page.width - document.page.margins.right, ruleY)
    .lineWidth(0.5)
    .strokeColor([200, 200, 200])
    .stroke()
    .strokeColor("black");
  document.y = ruleY + 6;
}

const MEAL_COL_WIDTH = 58;
const COL_GAP = 8;
const WATER_COL_WIDTH = 55;
const ITEM_ROW_HEIGHT = 13;
// Taller than a plain row: the meal name's own subtotal (below the meal
// name, in the same column) needs a second line of room. It's always
// shown, even for a single-item meal where it duplicates that item's own
// water value — a predictable fixed spot for the number beats hiding it
// only where it's non-redundant (see feedback_predictable_info_placement).
const MEAL_START_ROW_HEIGHT = 22;

function drawMealGroup(
  document: PDFKit.PDFDocument,
  meal: MealName,
  items: MealPlanSectionItem[],
) {
  const itemX = document.page.margins.left + MEAL_COL_WIDTH + COL_GAP;
  const itemWidth =
    contentWidth(document) - MEAL_COL_WIDTH - COL_GAP * 2 - WATER_COL_WIDTH;
  const waterX =
    document.page.width - document.page.margins.right - WATER_COL_WIDTH;

  items.forEach((item, index) => {
    const isFirstOfMeal = index === 0;
    const rowHeight = isFirstOfMeal ? MEAL_START_ROW_HEIGHT : ITEM_ROW_HEIGHT;
    ensureSpace(document, rowHeight);
    const rowY = document.y;

    if (isFirstOfMeal) {
      document
        .font("Source Sans 3 SemiBold")
        .fontSize(9)
        .fillColor([100, 100, 100])
        .text(MEAL_LABEL[meal], document.page.margins.left, rowY, {
          width: MEAL_COL_WIDTH,
        });

      const { missingCount } = sumWater(items);
      document
        .font("Source Sans 3 SemiBold")
        .fontSize(7)
        .fillColor(missingCount > 0 ? [100, 100, 100] : "black")
        .text(
          formatWaterSummary(items),
          document.page.margins.left,
          rowY + 11,
          { width: MEAL_COL_WIDTH },
        );
    }

    const quantityLabel = item.quantity > 1 ? `  ×${item.quantity}` : "";
    document
      .font("Source Sans 3")
      .fontSize(9)
      .fillColor("black")
      .text(item.name + quantityLabel, itemX, rowY, { width: itemWidth });

    const itemWater = itemWaterTotal(item);
    document
      .font(itemWater === null ? "Source Sans 3 SemiBold" : "Source Sans 3")
      .fontSize(9)
      .fillColor([100, 100, 100])
      .text(
        itemWater === null ? "no value" : `${itemWater} ml`,
        waterX,
        rowY,
        { width: WATER_COL_WIDTH, align: "right" },
      );

    document.y = rowY + rowHeight;
  });
}

export function drawMealPlanSection(
  document: PDFKit.PDFDocument,
  days: MealPlanSectionDay[],
): void {
  if (days.every((day) => day.items.length === 0)) return;

  drawSectionHeading(document, "Meal Plan");

  let currentDay: MealPlanSectionDay | null = null;
  withContinuationHeader(
    document,
    () => {
      drawSectionHeading(document, "Meal Plan (continued)");
      if (currentDay) drawDayHeader(document, currentDay, true);
    },
    () => {
      for (const day of days) {
        currentDay = day;
        drawDayHeader(document, day, false);
        for (const group of groupByMeal(day.items)) {
          drawMealGroup(document, group.meal, group.items);
        }
      }
    },
  );
}
