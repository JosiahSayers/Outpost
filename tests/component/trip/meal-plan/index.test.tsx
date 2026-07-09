import MealPlanSection from "$/frontend/trip/meal-plan";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function item(overrides: Partial<ClientMealPlanItem> = {}): ClientMealPlanItem {
  return {
    id: crypto.randomUUID(),
    name: "Oatmeal",
    meal: "breakfast",
    calories: 100,
    quantity: 1,
    waterMl: null,
    dryWeightGrams: null,
    ...overrides,
  };
}

function day(overrides: Partial<ClientMealPlanDay> = {}): ClientMealPlanDay {
  return {
    id: crypto.randomUUID(),
    dayNumber: 1,
    date: null,
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    ...overrides,
  };
}

function renderMealPlan(mealPlan: ClientMealPlanDay[]) {
  render(
    <MantineProvider>
      <MealPlanSection mealPlan={mealPlan} />
    </MantineProvider>,
  );
}

describe("MealPlanSection", () => {
  it("shows an empty state when there are no days", () => {
    renderMealPlan([]);
    expect(screen.getByText("No meals planned yet.")).toBeInTheDocument();
  });

  it("renders a labeled row for each day", () => {
    renderMealPlan([day({ dayNumber: 1 }), day({ dayNumber: 2 })]);
    // Both the desktop table and mobile cards render in the test DOM (media
    // queries never match), so each day label appears twice.
    expect(screen.getAllByText("Day 1")).not.toHaveLength(0);
    expect(screen.getAllByText("Day 2")).not.toHaveLength(0);
  });

  it("formats the day's date in UTC", () => {
    renderMealPlan([day({ date: "2026-08-14" })]);
    expect(screen.getAllByText("Aug 14")).not.toHaveLength(0);
  });

  it("renders item names under their meal", () => {
    renderMealPlan([
      day({
        meals: {
          breakfast: [item({ name: "Granola" })],
          lunch: [],
          dinner: [
            item({ name: "Pad Thai", meal: "dinner" }),
            item({ name: "Ramen", meal: "dinner" }),
          ],
          snacks: [item({ name: "Trail mix", meal: "snacks" })],
        },
      }),
    ]);

    expect(screen.getAllByText("Granola")).not.toHaveLength(0);
    expect(screen.getAllByText("Pad Thai, Ramen")).not.toHaveLength(0);
    expect(screen.getAllByText("Trail mix")).not.toHaveLength(0);
  });

  it("shows the quantity when an item has more than one", () => {
    renderMealPlan([
      day({
        meals: {
          breakfast: [item({ name: "Bars", quantity: 3 })],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      }),
    ]);

    expect(screen.getAllByText("Bars ×3")).not.toHaveLength(0);
  });
});
