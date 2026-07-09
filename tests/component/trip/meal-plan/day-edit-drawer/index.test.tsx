import DayEditDrawer from "$/frontend/trip/meal-plan/day-edit-drawer";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

function item(overrides: Partial<ClientMealPlanItem> = {}): ClientMealPlanItem {
  return {
    id: crypto.randomUUID(),
    name: "Oatmeal",
    meal: "breakfast",
    calories: 0,
    quantity: 1,
    waterMl: null,
    dryWeightGrams: null,
    ...overrides,
  };
}

function day(overrides: Partial<ClientMealPlanDay> = {}): ClientMealPlanDay {
  return {
    id: crypto.randomUUID(),
    dayNumber: 2,
    date: "2026-08-15",
    meals: { breakfast: [], lunch: [], dinner: [], snacks: [] },
    ...overrides,
  };
}

const onClose = mock(() => {});

function renderDrawer(d: ClientMealPlanDay) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <DayEditDrawer day={d} tripId="trip-1" opened onClose={onClose} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

function lastFetchCall(): [string, RequestInit] {
  const calls = (global.fetch as unknown as ReturnType<typeof mock>).mock.calls;
  return calls[calls.length - 1]! as [string, RequestInit];
}

beforeEach(() => {
  onClose.mockReset();
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ mealPlanItem: item() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("day header", () => {
  it("shows the day number and date", () => {
    renderDrawer(day({ dayNumber: 2, date: "2026-08-15" }));
    expect(screen.getByText("Day 2")).toBeInTheDocument();
    expect(screen.getByText("Aug 15")).toBeInTheDocument();
  });

  it("shows the total calories for the day", () => {
    renderDrawer(
      day({
        meals: {
          breakfast: [item({ calories: 350 })],
          lunch: [],
          dinner: [item({ calories: 500, quantity: 2, meal: "dinner" })],
          snacks: [],
        },
      }),
    );
    expect(screen.getByText("· 1,350 cal")).toBeInTheDocument();
  });

  it("omits the day calorie count when the day has no items", () => {
    renderDrawer(day());
    expect(screen.queryByText(/cal/)).not.toBeInTheDocument();
  });
});

describe("meal groups", () => {
  it("shows a calorie count in each meal header that has items", () => {
    renderDrawer(
      day({
        meals: {
          breakfast: [item({ calories: 350 }), item({ calories: 10 })],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      }),
    );
    // meal header total (360) is distinct from the day total in the drawer title
    expect(screen.getByText("360 cal")).toBeInTheDocument();
  });

  it("omits the calorie count for meals with no items", () => {
    renderDrawer(day());
    expect(screen.queryByText(/cal/)).not.toBeInTheDocument();
  });
});

describe("quick-add", () => {
  it("creates an item in the right meal via the API on Enter", async () => {
    renderDrawer(day({ dayNumber: 2 }));

    const input = screen.getByRole("textbox", { name: "Add to Dinner" });
    fireEvent.change(input, { target: { value: "Pad Thai" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/trips/trip-1/meal-plan/days/2/items");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      name: "Pad Thai",
      meal: "dinner",
    });
  });
});

describe("navigating to an item", () => {
  const breakfastDay = () =>
    day({
      dayNumber: 2,
      meals: {
        breakfast: [item({ id: "item-1", name: "Oatmeal", calories: 350 })],
        lunch: [],
        dinner: [],
        snacks: [],
      },
    });

  it("opens the edit view for the clicked item", async () => {
    renderDrawer(breakfastDay());

    fireEvent.click(screen.getByRole("button", { name: /Oatmeal/ }));

    await waitFor(() =>
      expect(screen.getByText("Edit item")).toBeInTheDocument(),
    );
    expect(screen.getByRole("textbox", { name: /^Name/ })).toHaveValue(
      "Oatmeal",
    );
  });

  it("returns to the overview when the back button is clicked", async () => {
    renderDrawer(breakfastDay());
    fireEvent.click(screen.getByRole("button", { name: /Oatmeal/ }));
    await waitFor(() =>
      expect(screen.getByText("Edit item")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Back to day" }));

    await waitFor(() => expect(screen.getByText("Day 2")).toBeInTheDocument());
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
