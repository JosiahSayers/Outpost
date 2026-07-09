import ItemRow from "$/frontend/trip/meal-plan/day-edit-drawer/item-row";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, mock } from "bun:test";

const onClick = mock(() => {});

function baseItem(
  overrides: Partial<ClientMealPlanItem> = {},
): ClientMealPlanItem {
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

function renderRow(item: ClientMealPlanItem) {
  render(
    <MantineProvider>
      <ItemRow item={item} onClick={onClick} />
    </MantineProvider>,
  );
}

beforeEach(() => {
  onClick.mockReset();
});

it("renders the item name", () => {
  renderRow(baseItem({ name: "Oatmeal" }));
  expect(screen.getByText("Oatmeal")).toBeInTheDocument();
});

it("calls onClick when clicked", () => {
  renderRow(baseItem());
  fireEvent.click(screen.getByRole("button", { name: /Oatmeal/ }));
  expect(onClick).toHaveBeenCalledTimes(1);
});

it("shows per-instance and total calories for items with a quantity above 1", () => {
  renderRow(baseItem({ name: "Instant coffee", calories: 10, quantity: 2 }));
  expect(screen.getByText("×2")).toBeInTheDocument();
  expect(screen.getByText("10 cal each · 20 total")).toBeInTheDocument();
});

it("shows plain calories for items with a quantity of 1", () => {
  renderRow(baseItem({ calories: 350 }));
  expect(screen.getByText("350 cal")).toBeInTheDocument();
  expect(screen.queryByText("×1")).not.toBeInTheDocument();
});

it("omits calories when the item has none tracked", () => {
  renderRow(baseItem({ calories: 0 }));
  expect(screen.queryByText(/cal/)).not.toBeInTheDocument();
});
