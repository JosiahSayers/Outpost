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

// useFluidDisplay and useWeightDisplay detect the locale-appropriate unit;
// the happy-dom test environment reports en-US, which resolves to cups and
// ounces respectively (see gear-stats-group.test.tsx for the weight case).

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

  it("shows each day's total calories, and the trip total, in both views", () => {
    renderMealPlan([
      day({
        dayNumber: 1,
        meals: {
          breakfast: [item({ calories: 350 })],
          lunch: [],
          dinner: [item({ calories: 500, quantity: 2, meal: "dinner" })],
          snacks: [],
        },
      }),
      day({
        dayNumber: 2,
        meals: {
          breakfast: [item({ calories: 500 })],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      }),
    ]);

    expect(screen.getAllByText("1,350 cal")).toHaveLength(2); // day 1
    expect(screen.getAllByText("500 cal")).toHaveLength(2); // day 2
    expect(screen.getAllByText("1,850 cal")).toHaveLength(2); // trip total
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

    // day total + trip total (which is the same single day), in each view
    expect(screen.getAllByText("0 cal")).toHaveLength(4);
  });

  it("rolls up the trip total weight to pounds while individual days stay in ounces, in both views", () => {
    renderMealPlan([
      day({
        dayNumber: 1,
        meals: {
          breakfast: [item({ dryWeightGrams: 400 })],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      }),
      day({
        dayNumber: 2,
        meals: {
          breakfast: [item({ dryWeightGrams: 400 })],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      }),
    ]);

    expect(screen.getAllByText("14.11 oz")).toHaveLength(4); // both days, both views
    expect(screen.getAllByText("1.76 lb")).toHaveLength(2); // trip total, both views
  });

  it("shows a water figure for each meal that needs it, and hides it for dry meals, in both views", () => {
    renderMealPlan([
      day({
        meals: {
          breakfast: [item({ waterMl: 180 }), item({ waterMl: 250 })],
          lunch: [item({ waterMl: null, meal: "lunch" })],
          dinner: [item({ waterMl: 350, meal: "dinner" })],
          snacks: [],
        },
      }),
    ]);

    expect(screen.getAllByText("1.82 cups")).toHaveLength(2); // breakfast
    expect(screen.getAllByText("1.48 cups")).toHaveLength(2); // dinner
    expect(screen.queryAllByText("0 cups")).toHaveLength(0); // lunch (dry)
  });

  it("shows every meal on the mobile card, even ones without items", () => {
    renderMealPlan([day()]);

    expect(screen.getAllByText("Nothing planned.")).toHaveLength(4);
  });
});
