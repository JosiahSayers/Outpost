import { describe, expect, it } from "bun:test";
import { transform } from "$/transformers/meal-plan/meal";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape", () => {
    const meal = make("MealPlanMeal", { mealName: "dinner" });
    expect(transform(meal)).toEqual({
      id: meal.id,
      mealName: "dinner",
    });
  });
});
