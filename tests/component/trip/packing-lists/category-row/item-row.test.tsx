import ItemRow from "$/frontend/trip/packing-lists/category-row/item-row";
import type { MergedPackingCategory } from "$/frontend/trip/placeholder-data";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

type Item = MergedPackingCategory["items"][number];

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    name: "Sleeping bag",
    packed: false,
    notNeeded: false,
    listId: 101,
    listName: "Wonderland Backpacking Kit",
    ...overrides,
  };
}

function renderItemRow(overrides: Partial<Item> = {}, multiList = false) {
  const onTogglePacked = mock();
  const onToggleNotNeeded = mock();
  render(
    <MantineProvider>
      <ItemRow
        item={item(overrides)}
        multiList={multiList}
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
    renderItemRow({ packed: false });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
  });

  it("renders a checked checkbox when packed", () => {
    renderItemRow({ packed: true });
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("dims the name when packed, without a strikethrough", () => {
    renderItemRow({ name: "Sleeping bag", packed: true });
    const text = screen.getByText("Sleeping bag");
    expect(text).not.toHaveStyle({ textDecoration: "line-through" });
  });

  it("shows the source list badge when the category spans multiple lists", () => {
    renderItemRow({ listName: "Cook & Food Kit" }, true);
    expect(screen.getByText("Cook & Food Kit")).toBeInTheDocument();
  });

  it("hides the source list badge for a single-list category", () => {
    renderItemRow({ listName: "Cook & Food Kit" }, false);
    expect(screen.queryByText("Cook & Food Kit")).not.toBeInTheDocument();
  });
});

describe("toggling packed", () => {
  it("calls onTogglePacked with the item id and new checked state", () => {
    const { onTogglePacked } = renderItemRow({ id: "item-7", packed: false });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onTogglePacked).toHaveBeenCalledWith("item-7", true);
  });

  it("calls onTogglePacked with false when unchecking a packed item", () => {
    const { onTogglePacked } = renderItemRow({ id: "item-8", packed: true });
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onTogglePacked).toHaveBeenCalledWith("item-8", false);
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
