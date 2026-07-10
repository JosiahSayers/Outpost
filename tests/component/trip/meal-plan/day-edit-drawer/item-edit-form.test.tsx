import ItemEditForm from "$/frontend/trip/meal-plan/day-edit-drawer/item-edit-form";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onDone = mock(() => {});

function item(overrides: Partial<ClientMealPlanItem> = {}): ClientMealPlanItem {
  return {
    id: "item-1",
    name: "Oatmeal",
    meal: "breakfast",
    calories: 350,
    quantity: 1,
    waterMl: 240,
    dryWeightGrams: 90,
    ...overrides,
  };
}

function renderForm(i: ClientMealPlanItem = item()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <ItemEditForm item={i} dayNumber={2} tripId="trip-1" onDone={onDone} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

function lastFetchCall(): [string, RequestInit] {
  const calls = (global.fetch as unknown as ReturnType<typeof mock>).mock.calls;
  return calls[calls.length - 1]! as [string, RequestInit];
}

beforeEach(() => {
  onDone.mockReset();
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ mealPlanItem: item() }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

it("pre-fills the form with the item's fields", async () => {
  renderForm();
  expect(screen.getByRole("textbox", { name: /^Name/ })).toHaveValue("Oatmeal");
  expect(screen.getByRole("textbox", { name: "Calories" })).toHaveValue("350");
  // Default display unit is locale-detected (cupsUS in the "en-US" test
  // environment), so the stored 240 ml renders as ~1.01 cups.
  expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue("1.01");
  expect(screen.getByRole("textbox", { name: "Dry weight (g)" })).toHaveValue(
    "90",
  );
  expect(screen.getByRole("combobox", { name: "Meal" })).toHaveValue(
    "Breakfast",
  );
  await waitFor(() => {});
});

describe("saving", () => {
  it("saves the edited fields via PATCH and calls onDone", async () => {
    renderForm();

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
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("sends null when a nullable field is cleared", async () => {
    renderForm();

    fireEvent.change(screen.getByRole("textbox", { name: "Water" }), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [, init] = lastFetchCall();
    expect(JSON.parse(init.body as string)).toMatchObject({ waterMl: null });
  });

  it("shows a validation error and does not submit when the name is cleared", async () => {
    renderForm();

    const name = screen.getByRole("textbox", { name: /^Name/ });
    fireEvent.change(name, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(name).toBeInvalid());
    expect(global.fetch).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });
});

describe("removing", () => {
  async function openRemoveConfirm() {
    fireEvent.click(screen.getByRole("button", { name: "Remove item" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Remove item?" }),
      ).toBeInTheDocument(),
    );
  }

  it("asks for confirmation before deleting", async () => {
    renderForm();
    await openRemoveConfirm();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("calls the delete API and onDone on confirm", async () => {
    renderForm();
    await openRemoveConfirm();

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = lastFetchCall();
    expect(url).toBe("/api/trips/trip-1/meal-plan/days/2/items/item-1");
    expect(init.method).toBe("DELETE");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("does not delete when cancelled", async () => {
    renderForm();
    await openRemoveConfirm();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
    await waitFor(() => {});
  });
});
