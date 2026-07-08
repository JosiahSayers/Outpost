import { describe, expect, it } from "bun:test";
import { transform } from "$/transformers/meal-plan/day";
import { make } from "../../../helpers/test-data/make";
import type { MealName } from "../../../../generated/prisma/client";

function makeAllMeals(mealPlanDayId: string) {
  return (["breakfast", "lunch", "dinner", "snacks"] as MealName[]).map(
    (mealName) => make("MealPlanMeal", { mealPlanDayId, mealName }),
  );
}

describe("transform", () => {
  it("returns the expected shape, keying meals by mealName", () => {
    const day = make("MealPlanDay", { date: new Date("2026-06-01") });
    const meals = makeAllMeals(day.id);

    expect(transform({ ...day, meals })).toEqual({
      id: day.id,
      dayNumber: day.dayNumber,
      date: "2026-06-01",
      meals: {
        breakfast: { id: meals[0]!.id, mealName: "breakfast" },
        lunch: { id: meals[1]!.id, mealName: "lunch" },
        dinner: { id: meals[2]!.id, mealName: "dinner" },
        snacks: { id: meals[3]!.id, mealName: "snacks" },
      },
    });
  });

  it("serializes a null date as null", () => {
    const day = { ...make("MealPlanDay"), date: null };
    const meals = makeAllMeals(day.id);

    expect(transform({ ...day, meals })).toMatchObject({ date: null });
  });

  it("does not depend on the order of the input meals", () => {
    const day = make("MealPlanDay");
    const meals = makeAllMeals(day.id).reverse();

    expect(transform({ ...day, meals }).meals).toEqual({
      breakfast: expect.objectContaining({ mealName: "breakfast" }),
      lunch: expect.objectContaining({ mealName: "lunch" }),
      dinner: expect.objectContaining({ mealName: "dinner" }),
      snacks: expect.objectContaining({ mealName: "snacks" }),
    });
  });

  it("throws when a meal is missing", () => {
    const day = make("MealPlanDay");
    const meals = makeAllMeals(day.id).filter(
      (meal) => meal.mealName !== "snacks",
    );

    expect(() => transform({ ...day, meals })).toThrow();
  });
});
