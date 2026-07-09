import { nextMealPlanDay } from "$/frontend/trip/meal-plan/helpers";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
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
