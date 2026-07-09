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

describe("day overview", () => {
  it("shows the day number and date in the header", () => {
    renderDrawer(day({ dayNumber: 2, date: "2026-08-15" }));
    expect(screen.getByText("Day 2")).toBeInTheDocument();
    expect(screen.getByText("Aug 15")).toBeInTheDocument();
  });

  it("shows the total calories for the day in the header", () => {
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

  it("shows per-instance and total calories for items with a quantity above 1", () => {
    renderDrawer(
      day({
        meals: {
          breakfast: [
            item({ name: "Instant coffee", calories: 10, quantity: 2 }),
          ],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      }),
    );
    expect(screen.getByText("×2")).toBeInTheDocument();
    expect(screen.getByText("10 cal each · 20 total")).toBeInTheDocument();
  });

  it("shows plain calories for items with a quantity of 1", () => {
    renderDrawer(
      day({
        meals: {
          breakfast: [item({ name: "Oatmeal", calories: 350 })],
          lunch: [],
          dinner: [],
          snacks: [],
        },
      }),
    );
    // appears twice: item row and breakfast header total
    expect(screen.getAllByText("350 cal")).toHaveLength(2);
  });
});

describe("quick-add", () => {
  it("creates an item on Enter and clears the input", async () => {
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
    expect(input).toHaveValue("");
  });

  it("does not create an item when the input is blank", () => {
    renderDrawer(day());

    const input = screen.getByRole("textbox", { name: "Add to Snacks" });
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("editing an item", () => {
  const breakfastDay = () =>
    day({
      dayNumber: 2,
      meals: {
        breakfast: [
          item({
            id: "item-1",
            name: "Oatmeal",
            calories: 350,
            quantity: 1,
            waterMl: 240,
            dryWeightGrams: 90,
          }),
        ],
        lunch: [],
        dinner: [],
        snacks: [],
      },
    });

  function openItem() {
    fireEvent.click(screen.getByRole("button", { name: /Oatmeal/ }));
  }

  it("opens a pre-filled form when an item row is clicked", async () => {
    renderDrawer(breakfastDay());
    openItem();

    await waitFor(() =>
      expect(screen.getByText("Edit item")).toBeInTheDocument(),
    );
    expect(screen.getByRole("textbox", { name: /^Name/ })).toHaveValue(
      "Oatmeal",
    );
    expect(screen.getByRole("textbox", { name: "Calories" })).toHaveValue(
      "350",
    );
    expect(screen.getByRole("textbox", { name: "Water (ml)" })).toHaveValue(
      "240",
    );
    expect(screen.getByRole("textbox", { name: "Dry weight (g)" })).toHaveValue(
      "90",
    );
    expect(screen.getByRole("combobox", { name: "Meal" })).toHaveValue(
      "Breakfast",
    );
  });

  it("returns to the overview when the back button is clicked", async () => {
    renderDrawer(breakfastDay());
    openItem();
    await waitFor(() =>
      expect(screen.getByText("Edit item")).toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Back to day" }));

    await waitFor(() => expect(screen.getByText("Day 2")).toBeInTheDocument());
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("saves the edited fields via PATCH and returns to the overview", async () => {
    renderDrawer(breakfastDay());
    openItem();
    await waitFor(() =>
      expect(screen.getByText("Edit item")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByRole("textbox", { name: /^Name/ }), {
      target: { value: "Granola" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "Calories" }), {
      target: { value: "400" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/trips/trip-1/meal-plan/days/2/items/item-1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toMatchObject({
      name: "Granola",
      calories: 400,
      quantity: 1,
      waterMl: 240,
      dryWeightGrams: 90,
    });
    await waitFor(() => expect(screen.getByText("Day 2")).toBeInTheDocument());
  });

  it("sends null when a nullable field is cleared", async () => {
    renderDrawer(breakfastDay());
    openItem();
    await waitFor(() =>
      expect(screen.getByText("Edit item")).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Water (ml)" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, init] = lastFetchCall();
    expect(JSON.parse(init.body as string)).toMatchObject({ waterMl: null });
  });

  it("shows a validation error and does not submit when the name is cleared", async () => {
    renderDrawer(breakfastDay());
    openItem();
    await waitFor(() =>
      expect(screen.getByText("Edit item")).toBeInTheDocument(),
    );

    const name = screen.getByRole("textbox", { name: /^Name/ });
    fireEvent.change(name, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(name).toBeInvalid());
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe("removing an item", () => {
  const dayWithItem = () =>
    day({
      dayNumber: 2,
      meals: {
        breakfast: [item({ id: "item-1", name: "Oatmeal" })],
        lunch: [],
        dinner: [],
        snacks: [],
      },
    });

  async function openRemoveConfirm() {
    fireEvent.click(screen.getByRole("button", { name: /Oatmeal/ }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Remove item" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove item" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Remove item?" }),
      ).toBeInTheDocument(),
    );
  }

  it("asks for confirmation before deleting", async () => {
    renderDrawer(dayWithItem());
    await openRemoveConfirm();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls the delete API on confirm", async () => {
    renderDrawer(dayWithItem());
    await openRemoveConfirm();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/trips/trip-1/meal-plan/days/2/items/item-1");
    expect(init.method).toBe("DELETE");
  });

  it("does not delete when cancelled", async () => {
    renderDrawer(dayWithItem());
    await openRemoveConfirm();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
