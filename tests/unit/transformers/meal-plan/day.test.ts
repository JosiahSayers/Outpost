import { describe, expect, it } from "bun:test";
import { transform } from "$/transformers/meal-plan/day";
import type { MealName } from "../../../../generated/prisma/enums";
import { make } from "../../../helpers/test-data/make";

function makeDayItem(overrides: { mealPlanDayId: string; meal: MealName }) {
  const mealPlanItem = make("MealPlanItem");
  return {
    ...make("MealPlanDayItem", { mealPlanItemId: mealPlanItem.id, ...overrides }),
    mealPlanItem,
  };
}

describe("transform", () => {
  it("returns the expected shape, grouping items by meal", () => {
    const day = make("MealPlanDay", { date: new Date("2026-06-01") });
    const breakfastItem = makeDayItem({
      mealPlanDayId: day.id,
      meal: "breakfast",
    });
    const dinnerItem = makeDayItem({
      mealPlanDayId: day.id,
      meal: "dinner",
    });

    expect(transform({ ...day, items: [breakfastItem, dinnerItem] })).toEqual({
      id: day.id,
      dayNumber: day.dayNumber,
      date: "2026-06-01",
      meals: {
        breakfast: [expect.objectContaining({ id: breakfastItem.id })],
        lunch: [],
        dinner: [expect.objectContaining({ id: dinnerItem.id })],
        snacks: [],
      },
    });
  });

  it("serializes a null date as null", () => {
    const day = { ...make("MealPlanDay"), date: null };

    expect(transform({ ...day, items: [] })).toMatchObject({
      date: null,
    });
  });

  it("returns empty arrays for every meal when there are no items", () => {
    const day = make("MealPlanDay");

    expect(transform({ ...day, items: [] }).meals).toEqual({
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
    });
  });

  it("groups multiple items under the same meal", () => {
    const day = make("MealPlanDay");
    const items = [
      makeDayItem({ mealPlanDayId: day.id, meal: "snacks" }),
      makeDayItem({ mealPlanDayId: day.id, meal: "snacks" }),
    ];

    expect(transform({ ...day, items }).meals.snacks).toHaveLength(2);
  });
});
