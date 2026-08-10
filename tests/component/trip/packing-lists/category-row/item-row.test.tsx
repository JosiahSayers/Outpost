import ItemRow from "$/frontend/trip/packing-lists/category-row/item-row";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import type { ClientTripPackingListItem } from "$/transformers/trip-packing-list/item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function gear(
  overrides: Partial<ClientGearInventoryItem> = {},
): ClientGearInventoryItem {
  return {
    id: "gear-1",
    name: "Trekking poles",
    quantity: 1,
    grams: 500,
    category: { id: "cat-1", name: "Trekking", public: false },
    ...overrides,
  };
}

function item(
  overrides: Partial<ClientTripPackingListItem> = {},
): ClientTripPackingListItem {
  return {
    id: "item-1",
    name: "Sleeping bag",
    optional: false,
    quantity: 1,
    sortPosition: 0,
    trackGearAssignment: true,
    assignedGear: null,
    category: null,
    status: { packed: false, notNeeded: false },
    ...overrides,
  };
}

function renderItemRow(overrides: Partial<ClientTripPackingListItem> = {}) {
  const onTogglePacked = mock();
  const onToggleNotNeeded = mock();
  render(
    <MantineProvider>
      <ItemRow
        item={item(overrides)}
        onTogglePacked={onTogglePacked}
        onToggleNotNeeded={onToggleNotNeeded}
      />
    </MantineProvider>,
  );
  return { onTogglePacked, onToggleNotNeeded };
}

describe("rendering", () => {
  it("renders the item name", () => {
    renderItemRow({ name: "Sleeping bag" });
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  });

  it("renders an unchecked checkbox when not packed", () => {
    renderItemRow({ status: { packed: false, notNeeded: false } });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("renders a checked checkbox when packed", () => {
    renderItemRow({ status: { packed: true, notNeeded: false } });
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("dims the name when packed, without a strikethrough", () => {
    renderItemRow({
      name: "Sleeping bag",
      status: { packed: true, notNeeded: false },
    });
    const text = screen.getByText("Sleeping bag");
    expect(text).not.toHaveStyle({ textDecoration: "line-through" });
  });
});

describe("toggling packed", () => {
  it("calls onTogglePacked with the item id and new checked state", () => {
    const { onTogglePacked } = renderItemRow({
      id: "item-7",
      status: { packed: false, notNeeded: false },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onTogglePacked).toHaveBeenCalledWith("item-7", true);
  });

  it("calls onTogglePacked with false when unchecking a packed item", () => {
    const { onTogglePacked } = renderItemRow({
      id: "item-8",
      status: { packed: true, notNeeded: false },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onTogglePacked).toHaveBeenCalledWith("item-8", false);
  });
});

describe("quantity", () => {
  it("does not show a quantity when quantity is 1", () => {
    renderItemRow({ quantity: 1 });
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });

  it("shows the quantity when greater than 1", () => {
    renderItemRow({ quantity: 3 });
    expect(screen.getByText("×3")).toBeInTheDocument();
  });
});

describe("assigned gear", () => {
  it("renders the assigned gear's name and weight", () => {
    renderItemRow({ assignedGear: gear({ name: "Trekking poles" }) });
    expect(screen.getByText("Trekking poles")).toBeInTheDocument();
  });

  it("renders nothing extra when no gear is assigned", () => {
    renderItemRow({ assignedGear: null });
    expect(screen.queryByText(/Trekking poles/)).not.toBeInTheDocument();
  });
});

describe("marking as not needed", () => {
  it("calls onToggleNotNeeded with the item id and true", () => {
    const { onToggleNotNeeded } = renderItemRow({
      id: "item-9",
      name: "Gloves",
    });
    fireEvent.click(
      document.querySelector(
        '[aria-label="Mark Gloves as not needed for this trip"]',
      )!,
    );
    expect(onToggleNotNeeded).toHaveBeenCalledWith("item-9", true);
  });
});
