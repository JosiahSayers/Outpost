import ExcludedItems from "$/frontend/trip/packing-lists/category-row/excluded-items";
import type { ClientTripPackingListItem } from "$/transformers/trip-packing-list/item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function item(
  overrides: Partial<ClientTripPackingListItem> = {},
): ClientTripPackingListItem {
  return {
    id: "item-1",
    name: "Gloves",
    optional: false,
    quantity: 1,
    sortPosition: 0,
    assignedGear: null,
    status: { packed: false, notNeeded: true },
    ...overrides,
  };
}

function renderExcludedItems(items: ClientTripPackingListItem[]) {
  const onToggleNotNeeded = mock();
  render(
    <MantineProvider>
      <ExcludedItems items={items} onToggleNotNeeded={onToggleNotNeeded} />
    </MantineProvider>,
  );
  return { onToggleNotNeeded };
}

describe("rendering", () => {
  it("renders the count of not-needed items in the toggle label", () => {
    renderExcludedItems([item({ id: "a" }), item({ id: "b", name: "Hat" })]);
    expect(
      screen.getByText("Not needed for this trip (2)"),
    ).toBeInTheDocument();
  });

  it("renders each item's name with a strikethrough", () => {
    renderExcludedItems([item({ name: "Gloves" })]);
    expect(screen.getByText("Gloves")).toHaveStyle({
      textDecoration: "line-through",
    });
  });

  it("renders an Include button per item, once expanded", async () => {
    renderExcludedItems([item({ id: "a" }), item({ id: "b", name: "Hat" })]);
    fireEvent.click(screen.getByText("Not needed for this trip (2)"));
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "Include" })).toHaveLength(
        2,
      ),
    );
  });
});

describe("including an item back", () => {
  it("calls onToggleNotNeeded with the item id and false", async () => {
    const { onToggleNotNeeded } = renderExcludedItems([
      item({ id: "item-9", name: "Gloves" }),
    ]);
    fireEvent.click(screen.getByText("Not needed for this trip (1)"));
    await waitFor(() => screen.getByRole("button", { name: "Include" }));
    fireEvent.click(screen.getByRole("button", { name: "Include" }));
    expect(onToggleNotNeeded).toHaveBeenCalledWith("item-9", false);
  });
});
