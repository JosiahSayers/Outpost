import {
  dayCalories,
  formatCalories,
  itemCaloriesSummary,
  itemTotalCalories,
  mealCalories,
  nextMealPlanDay,
} from "$/frontend/trip/meal-plan/helpers";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { describe, expect, it } from "bun:test";

function day(overrides: Partial<ClientMealPlanDay> = {}): ClientMealPlanDay {
  return {
    id: crypto.randomUUID(),
    dayNumber: 1,
    date: null,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    ...overrides,
  };
}

function item(overrides: Partial<ClientMealPlanItem> = {}): ClientMealPlanItem {
  return {
    id: crypto.randomUUID(),
    name: "Oatmeal",
    meal: "breakfast",
    calories: 0,
    quantity: 1,
    waterMl: null,
    dryWeightGrams: null,
    ...overrides,
  };
}

describe("nextMealPlanDay", () => {
  it("starts an empty plan at day 1 with the trip start date", () => {
    expect(nextMealPlanDay([], "2026-08-14")).toEqual({
      dayNumber: 1,
      date: "2026-08-14",
    });
  });

  it("starts an empty plan with no date when the trip has no start date", () => {
    expect(nextMealPlanDay([], null)).toEqual({ dayNumber: 1, date: null });
  });

  it("appends one past the last day, dated one day later", () => {
    const plan = [
      day({ dayNumber: 1, date: "2026-08-14" }),
      day({ dayNumber: 2, date: "2026-08-15" }),
    ];
    expect(nextMealPlanDay(plan, "2026-08-14")).toEqual({
      dayNumber: 3,
      date: "2026-08-16",
    });
  });

  it("uses the highest day number even when the plan is unsorted or has gaps", () => {
    const plan = [
      day({ dayNumber: 4, date: "2026-08-17" }),
      day({ dayNumber: 1, date: "2026-08-14" }),
    ];
    expect(nextMealPlanDay(plan, "2026-08-14")).toEqual({
      dayNumber: 5,
      date: "2026-08-18",
    });
  });

  it("rolls the date over a month boundary", () => {
    expect(nextMealPlanDay([day({ date: "2026-08-31" })], null)).toEqual({
      dayNumber: 2,
      date: "2026-09-01",
    });
  });

  it("derives the date from the trip start when the last day has no date", () => {
    const plan = [day({ dayNumber: 3, date: null })];
    expect(nextMealPlanDay(plan, "2026-08-14")).toEqual({
      dayNumber: 4,
      date: "2026-08-17",
    });
  });

  it("has no date when the last day has no date and the trip has no start", () => {
    const plan = [day({ dayNumber: 1, date: null })];
    expect(nextMealPlanDay(plan, null)).toEqual({
      dayNumber: 2,
      date: null,
    });
  });
});

describe("itemTotalCalories", () => {
  it("multiplies calories by quantity", () => {
    expect(itemTotalCalories(item({ calories: 350, quantity: 3 }))).toBe(1050);
  });
});

describe("mealCalories", () => {
  it("sums item totals, accounting for quantity", () => {
    const items = [
      item({ calories: 350, quantity: 1 }),
      item({ calories: 10, quantity: 2 }),
    ];
    expect(mealCalories(items)).toBe(370);
  });

  it("is 0 for an empty meal", () => {
    expect(mealCalories([])).toBe(0);
  });
});

describe("dayCalories", () => {
  it("sums across every meal", () => {
    const d = day({
      meals: {
        breakfast: [item({ calories: 350 })],
        lunch: [item({ calories: 540, meal: "lunch" })],
        dinner: [item({ calories: 670, meal: "dinner", quantity: 2 })],
        snacks: [],
      },
    });
    expect(dayCalories(d)).toBe(2230);
  });
});

describe("formatCalories", () => {
  it("formats with a thousands separator and unit", () => {
    expect(formatCalories(2230)).toBe("2,230 cal");
  });
});

describe("itemCaloriesSummary", () => {
  it("is null when calories are not tracked", () => {
    expect(itemCaloriesSummary(item({ calories: 0, quantity: 3 }))).toBeNull();
  });

  it("shows plain calories for a quantity of 1", () => {
    expect(itemCaloriesSummary(item({ calories: 350, quantity: 1 }))).toBe(
      "350 cal",
    );
  });

  it("shows per-instance and total calories for a quantity above 1", () => {
    expect(itemCaloriesSummary(item({ calories: 350, quantity: 4 }))).toBe(
      "350 cal each · 1,400 total",
    );
  });
});
