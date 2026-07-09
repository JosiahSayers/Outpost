import { sortMealPlan } from "$/frontend/utils/sort-meal-plan";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { describe, expect, it } from "bun:test";

function item(
  id: string,
  name: string,
  meal: ClientMealPlanItem["meal"] = "breakfast",
): ClientMealPlanItem {
  return {
    id,
    name,
    meal,
    calories: 100,
    quantity: 1,
    waterMl: null,
    dryWeightGrams: null,
  };
}

function day(
  dayNumber: number,
  meals: Partial<ClientMealPlanDay["meals"]> = {},
): ClientMealPlanDay {
  return {
    id: `day-${dayNumber}`,
    dayNumber,
    date: null,
    meals: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snacks: [],
      ...meals,
    },
  };
}

describe("sortMealPlan", () => {
  it("sorts days by day number ascending", () => {
    const days = [day(3), day(1), day(2)];

    expect(sortMealPlan(days).map((d) => d.dayNumber)).toEqual([1, 2, 3]);
  });

  it("sorts the items within each meal by name", () => {
    const days = [
      day(1, {
        breakfast: [
          item("a", "Oatmeal"),
          item("b", "Coffee"),
          item("c", "Granola"),
        ],
      }),
    ];

    expect(sortMealPlan(days)[0]!.meals.breakfast.map((i) => i.name)).toEqual([
      "Coffee",
      "Granola",
      "Oatmeal",
    ]);
  });

  it("breaks name ties by id so the order is stable", () => {
    const days = [
      day(1, {
        dinner: [item("b", "Ramen", "dinner"), item("a", "Ramen", "dinner")],
      }),
    ];

    expect(sortMealPlan(days)[0]!.meals.dinner.map((i) => i.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("does not mutate the input", () => {
    const days = [
      day(2, {
        lunch: [item("b", "Wraps", "lunch"), item("a", "Bars", "lunch")],
      }),
      day(1),
    ];
    const originalOrder = days.map((d) => d.dayNumber);
    const originalItems = [...days[0]!.meals.lunch];

    sortMealPlan(days);

    expect(days.map((d) => d.dayNumber)).toEqual(originalOrder);
    expect(days[0]!.meals.lunch).toEqual(originalItems);
  });

  it("returns an empty array for empty input", () => {
    expect(sortMealPlan([])).toEqual([]);
  });
});
