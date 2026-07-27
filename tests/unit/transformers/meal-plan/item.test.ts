import { describe, expect, it } from "bun:test";
import { transform } from "$/transformers/meal-plan/item";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape", () => {
    const item = {
      ...make("MealPlanItem", {
        meal: "dinner",
        name: "Dehydrated chili",
        calories: 650,
        quantity: 2,
        waterMl: 400,
        dryWeightGrams: 120,
      }),
      packingStatuses: [],
    };

    expect(transform(item)).toEqual({
      id: item.id,
      name: "Dehydrated chili",
      calories: 650,
      quantity: 2,
      waterMl: 400,
      dryWeightGrams: 120,
      meal: "dinner",
      status: { purchased: false, packed: false },
    });
  });

  it("passes through null waterMl and dryWeightGrams", () => {
    const item = {
      ...make("MealPlanItem"),
      waterMl: null,
      dryWeightGrams: null,
      packingStatuses: [],
    };

    expect(transform(item)).toMatchObject({
      waterMl: null,
      dryWeightGrams: null,
    });
  });

  it("returns the packed/purchased values from the first packing status", () => {
    const status = make("MealPlanItemPackingStatus", {
      purchased: true,
      packed: true,
    });
    const item = {
      ...make("MealPlanItem"),
      packingStatuses: [status],
    };

    expect(transform(item)).toMatchObject({
      status: { purchased: true, packed: true },
    });
  });
});
