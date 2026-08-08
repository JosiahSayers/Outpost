import { describe, expect, it } from "bun:test";
import { transform } from "$/transformers/meal-plan/item";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape", () => {
    const mealPlanItem = make("MealPlanItem", {
      name: "Dehydrated chili",
      brand: "Backpacker's Pantry",
      calories: 650,
      waterMl: 400,
      dryWeightGrams: 120,
    });
    const dayItem = {
      ...make("MealPlanDayItem", {
        mealPlanItemId: mealPlanItem.id,
        meal: "dinner",
        quantity: 2,
      }),
      mealPlanItem,
    };

    expect(transform(dayItem)).toEqual({
      id: dayItem.id,
      mealPlanItemId: mealPlanItem.id,
      name: "Dehydrated chili",
      brand: "Backpacker's Pantry",
      calories: 650,
      quantity: 2,
      waterMl: 400,
      dryWeightGrams: 120,
      meal: "dinner",
      status: { purchased: false, packed: false },
    });
  });

  it("passes through null brand, waterMl, and dryWeightGrams", () => {
    const mealPlanItem = make("MealPlanItem", {
      brand: null,
      waterMl: null,
      dryWeightGrams: null,
    });
    const dayItem = { ...make("MealPlanDayItem"), mealPlanItem };

    expect(transform(dayItem)).toMatchObject({
      brand: null,
      waterMl: null,
      dryWeightGrams: null,
    });
  });

  it("returns the packed/purchased values from the day item", () => {
    const mealPlanItem = make("MealPlanItem");
    const dayItem = {
      ...make("MealPlanDayItem", { purchased: true, packed: true }),
      mealPlanItem,
    };

    expect(transform(dayItem)).toMatchObject({
      status: { purchased: true, packed: true },
    });
  });
});
