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
    mealPlanItemId: crypto.randomUUID(),
    name: "Oatmeal",
    brand: null,
    meal: "breakfast",
    calories: 0,
    quantity: 1,
    waterMl: null,
    dryWeightGrams: null,
    status: { packed: false, purchased: false },
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

it("briefly highlights the quantity when it changes, then fades", () => {
  const item = baseItem({ quantity: 1 });
  const { rerender } = render(
    <MantineProvider>
      <ItemRow item={item} onClick={onClick} />
    </MantineProvider>,
  );

  rerender(
    <MantineProvider>
      <ItemRow item={{ ...item, quantity: 2 }} onClick={onClick} />
    </MantineProvider>,
  );

  const quantityText = screen.getByText("×2");
  expect(quantityText.style.backgroundColor).toBe(
    "var(--mantine-color-yellow-2)",
  );
});

it("does not highlight the quantity on initial render", () => {
  renderRow(baseItem({ quantity: 3 }));
  const quantityText = screen.getByText("×3");
  expect(quantityText.style.backgroundColor).toBe("transparent");
});
