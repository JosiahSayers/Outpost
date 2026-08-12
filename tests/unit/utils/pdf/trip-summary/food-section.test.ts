import {
  foodDaysToSections,
  type FoodSectionDay,
} from "$/utils/pdf/trip-summary/food-section";
import { describe, expect, it } from "bun:test";

function day(overrides: Partial<FoodSectionDay> = {}): FoodSectionDay {
  return {
    dayNumber: 1,
    date: new Date("2026-08-14T00:00:00.000Z"),
    items: [],
    ...overrides,
  };
}

describe("foodDaysToSections", () => {
  it("returns one section per day, named 'Food — <day label>'", () => {
    const sections = foodDaysToSections([
      day({
        dayNumber: 1,
        date: new Date("2026-08-14T00:00:00.000Z"),
        items: [
          {
            meal: "breakfast",
            name: "Oatmeal",
            quantity: 1,
            purchased: true,
            packed: false,
          },
        ],
      }),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0]!.name).toBe("Food — Day 1 — Fri, Aug 14");
  });

  it("sorts days by dayNumber regardless of input order", () => {
    const sections = foodDaysToSections([
      day({
        dayNumber: 3,
        items: [
          {
            meal: "dinner",
            name: "C",
            quantity: 1,
            purchased: false,
            packed: false,
          },
        ],
      }),
      day({
        dayNumber: 1,
        items: [
          {
            meal: "breakfast",
            name: "A",
            quantity: 1,
            purchased: false,
            packed: false,
          },
        ],
      }),
    ]);

    expect(sections.map((s) => s.name)).toEqual([
      expect.stringContaining("Day 1"),
      expect.stringContaining("Day 3"),
    ]);
  });

  it("filters out days with no items entirely", () => {
    const sections = foodDaysToSections([
      day({ dayNumber: 1, items: [] }),
      day({
        dayNumber: 2,
        items: [
          {
            meal: "lunch",
            name: "Tortillas",
            quantity: 1,
            purchased: false,
            packed: false,
          },
        ],
      }),
    ]);

    expect(sections).toHaveLength(1);
    expect(sections[0]!.name).toContain("Day 2");
  });

  it("offsets sortPosition well past any realistic gear category, preserving day order", () => {
    const sections = foodDaysToSections([
      day({
        dayNumber: 1,
        items: [
          {
            meal: "breakfast",
            name: "A",
            quantity: 1,
            purchased: false,
            packed: false,
          },
        ],
      }),
      day({
        dayNumber: 2,
        items: [
          {
            meal: "lunch",
            name: "B",
            quantity: 1,
            purchased: false,
            packed: false,
          },
        ],
      }),
    ]);

    expect(sections[0]!.sortPosition).toBe(1000);
    expect(sections[1]!.sortPosition).toBe(1001);
  });

  it("sets the two-checkbox legend on every food section", () => {
    const sections = foodDaysToSections([
      day({
        items: [
          {
            meal: "breakfast",
            name: "A",
            quantity: 1,
            purchased: false,
            packed: false,
          },
        ],
      }),
    ]);

    expect(sections[0]!.checkboxLegend).toBe("Bought · Packed");
  });

  it("appends the meal label to each item's name and carries quantity/status through", () => {
    const sections = foodDaysToSections([
      day({
        items: [
          {
            meal: "dinner",
            name: "Chili mac",
            quantity: 2,
            purchased: true,
            packed: false,
          },
        ],
      }),
    ]);

    expect(sections[0]!.items[0]).toMatchObject({
      name: "Chili mac · Dinner",
      quantity: 2,
      optional: false,
      assignedGear: null,
      foodStatus: { purchased: true, packed: false },
    });
  });
});
