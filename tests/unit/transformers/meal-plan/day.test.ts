import { describe, expect, it } from "bun:test";
import { transform } from "$/transformers/meal-plan/day";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape, grouping items by meal", () => {
    const day = make("MealPlanDay", { date: new Date("2026-06-01") });
    const breakfastItem = make("MealPlanItem", {
      mealPlanDayId: day.id,
      meal: "breakfast",
    });
    const dinnerItem = make("MealPlanItem", {
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
      make("MealPlanItem", { mealPlanDayId: day.id, meal: "snacks" }),
      make("MealPlanItem", { mealPlanDayId: day.id, meal: "snacks" }),
    ];

    expect(transform({ ...day, items }).meals.snacks).toHaveLength(2);
  });
});
