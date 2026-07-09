import MealPlanSection from "$/frontend/trip/meal-plan";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <MealPlanSection tripId="trip-1" mealPlan={mealPlan} tripStart={null} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("MealPlanSection", () => {
  it("shows an empty state when there are no days", () => {
    renderMealPlan([]);
    expect(screen.getByText("No meals planned yet.")).toBeInTheDocument();
  });

  it("shows the Add day button even when the plan is empty", () => {
    renderMealPlan([]);
    expect(screen.getByRole("button", { name: "Add day" })).toBeInTheDocument();
  });

  it("shows the Add day button when the plan has days", () => {
    renderMealPlan([day()]);
    expect(screen.getByRole("button", { name: "Add day" })).toBeInTheDocument();
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

  // Both the desktop table and mobile cards render in the test DOM (media
  // queries never match), and both list items individually, so each item's
  // details appear exactly twice.
  it("lists item names individually under their meal in both views", () => {
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

    expect(screen.getAllByText("Granola")).toHaveLength(2);
    expect(screen.getAllByText("Pad Thai")).toHaveLength(2);
    expect(screen.getAllByText("Ramen")).toHaveLength(2);
    expect(screen.getAllByText("Trail mix")).toHaveLength(2);
  });

  it("shows the quantity next to an item's name in both views", () => {
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

    expect(screen.getAllByText("Bars")).toHaveLength(2);
    expect(screen.getAllByText("×3")).toHaveLength(2);
  });

  it("shows the day's total calories in both views", () => {
    renderMealPlan([
      day({
        meals: {
          breakfast: [item({ calories: 350 })],
          lunch: [],
          dinner: [item({ calories: 500, quantity: 2, meal: "dinner" })],
          snacks: [],
        },
      }),
    ]);

    expect(screen.getAllByText("1,350 cal")).toHaveLength(2);
  });

  it("shows a calorie count for each meal that has items in both views", () => {
    renderMealPlan([
      day({
        meals: {
          breakfast: [item({ calories: 350 }), item({ calories: 10 })],
          lunch: [],
          dinner: [item({ calories: 700, meal: "dinner" })],
          snacks: [],
        },
      }),
    ]);

    // 360 breakfast + 700 dinner; the day header shows the combined 1,060
    expect(screen.getAllByText("360 cal")).toHaveLength(2);
    expect(screen.getAllByText("700 cal")).toHaveLength(2);
    expect(screen.getAllByText("1,060 cal")).toHaveLength(2);
  });

  it("shows 0 cal totals when items exist but calories are untracked", () => {
    renderMealPlan([
      day({
        meals: {
          breakfast: [item({ name: "Granola", calories: 0 })],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      }),
    ]);

    // meal subtotal + day total, in each of the two views
    expect(screen.getAllByText("0 cal")).toHaveLength(4);
  });

  it("shows every meal on the mobile card, even ones without items", () => {
    renderMealPlan([day()]);

    expect(screen.getAllByText("Nothing planned.")).toHaveLength(4);
  });
});
