import {
  drawMealPlanSection,
  formatWaterSummary,
  groupByMeal,
  itemWaterTotal,
  sumWater,
  type MealPlanSectionItem,
} from "$/utils/pdf/trip-summary/meal-plan-section";
import { describe, expect, it } from "bun:test";
import { makeTestDocument, pageCount } from "../../../../helpers/pdf";

function item(
  overrides: Partial<MealPlanSectionItem> = {},
): MealPlanSectionItem {
  return {
    meal: "breakfast",
    name: "Oatmeal",
    quantity: 1,
    waterMl: 250,
    ...overrides,
  };
}

describe("itemWaterTotal", () => {
  it("multiplies the per-unit value by quantity", () => {
    expect(itemWaterTotal(item({ waterMl: 250, quantity: 3 }))).toBe(750);
  });

  it("treats a real 0ml value as a real total, not missing", () => {
    expect(itemWaterTotal(item({ waterMl: 0, quantity: 4 }))).toBe(0);
  });

  it("propagates null (no value entered) regardless of quantity", () => {
    expect(itemWaterTotal(item({ waterMl: null, quantity: 4 }))).toBeNull();
  });
});

describe("sumWater", () => {
  it("sums real values and ignores missing ones in the total", () => {
    const items = [
      item({ waterMl: 100 }),
      item({ waterMl: null }),
      item({ waterMl: 200 }),
    ];
    expect(sumWater(items)).toEqual({ totalMl: 300, missingCount: 1 });
  });

  it("counts a real 0ml item toward the total, not toward missingCount", () => {
    const items = [item({ waterMl: 0 }), item({ waterMl: 100 })];
    expect(sumWater(items)).toEqual({ totalMl: 100, missingCount: 0 });
  });

  it("returns zeros for an empty item list", () => {
    expect(sumWater([])).toEqual({ totalMl: 0, missingCount: 0 });
  });
});

describe("formatWaterSummary", () => {
  it("shows just the total when nothing is missing", () => {
    expect(formatWaterSummary([item({ waterMl: 300 })])).toBe("300 ml");
  });

  it("appends a missing count when some items are missing a value", () => {
    expect(
      formatWaterSummary([item({ waterMl: 300 }), item({ waterMl: null })]),
    ).toBe("300 ml · 1 missing");
  });

  it("shows 'no value' when every item is missing a value", () => {
    expect(
      formatWaterSummary([item({ waterMl: null }), item({ waterMl: null })]),
    ).toBe("no value");
  });
});

describe("groupByMeal", () => {
  it("groups items under their meal and orders groups breakfast/lunch/dinner/snacks", () => {
    const items = [
      item({ meal: "snacks", name: "Trail mix" }),
      item({ meal: "dinner", name: "Chili mac" }),
      item({ meal: "breakfast", name: "Oatmeal" }),
    ];

    expect(groupByMeal(items).map((g) => g.meal)).toEqual([
      "breakfast",
      "dinner",
      "snacks",
    ]);
  });

  it("omits meals with no items instead of returning an empty group", () => {
    const items = [item({ meal: "lunch" })];
    expect(groupByMeal(items)).toEqual([{ meal: "lunch", items }]);
  });

  it("keeps every item for a meal that has more than one", () => {
    const items = [
      item({ meal: "breakfast", name: "Oatmeal" }),
      item({ meal: "breakfast", name: "Coffee" }),
    ];
    expect(groupByMeal(items)[0]!.items).toHaveLength(2);
  });
});

describe("drawMealPlanSection", () => {
  it("draws nothing when every day has zero items", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawMealPlanSection(document, [
      { dayNumber: 1, date: null, items: [] },
      { dayNumber: 2, date: null, items: [] },
    ]);
    expect(document.y).toBe(before);
    expect(pageCount(document)).toBe(1);
  });

  it("draws nothing for an empty days array", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawMealPlanSection(document, []);
    expect(document.y).toBe(before);
  });

  it("renders a typical multi-day, multi-meal plan without throwing", () => {
    const document = makeTestDocument();
    const before = document.y;
    drawMealPlanSection(document, [
      {
        dayNumber: 1,
        date: new Date("2026-08-14T00:00:00.000Z"),
        items: [
          item({ meal: "breakfast", name: "Oatmeal", waterMl: 350 }),
          item({ meal: "dinner", name: "Chili mac", waterMl: null }),
        ],
      },
      {
        dayNumber: 2,
        date: new Date("2026-08-15T00:00:00.000Z"),
        items: [item({ meal: "lunch", name: "Tortillas", waterMl: 0 })],
      },
    ]);
    expect(document.y).toBeGreaterThan(before);
    expect(pageCount(document)).toBe(1);
  });

  it("paginates across multiple pages once days overflow a single page", () => {
    const document = makeTestDocument();
    const days = Array.from({ length: 40 }, (_, i) => ({
      dayNumber: i + 1,
      date: null,
      items: [
        item({ meal: "breakfast", name: `Breakfast ${i}` }),
        item({ meal: "lunch", name: `Lunch ${i}` }),
        item({ meal: "dinner", name: `Dinner ${i}` }),
      ],
    }));

    drawMealPlanSection(document, days);

    expect(pageCount(document)).toBeGreaterThan(1);
  });
});
