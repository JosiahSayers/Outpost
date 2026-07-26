import CategoryRow from "$/frontend/trip/packing-lists/category-row";
import type { MergedPackingCategory } from "$/frontend/trip/placeholder-data";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

type Item = MergedPackingCategory["items"][number];

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: "item-1",
    name: "Item",
    packed: false,
    notNeeded: false,
    listId: 101,
    listName: "Wonderland Backpacking Kit",
    ...overrides,
  };
}

function category(
  overrides: Partial<MergedPackingCategory> = {},
): MergedPackingCategory {
  return {
    name: "Clothing",
    items: [
      makeItem({ id: "1", name: "Rain jacket", packed: true }),
      makeItem({ id: "2", name: "Fleece", packed: true }),
      makeItem({ id: "3", name: "Sun hat", packed: false }),
      makeItem({ id: "4", name: "Gloves", packed: false, notNeeded: true }),
    ],
    ...overrides,
  };
}

function renderRow(cat: MergedPackingCategory = category()) {
  const onTogglePacked = mock();
  const onToggleNotNeeded = mock();
  const utils = render(
    <MantineProvider>
      <CategoryRow
        category={cat}
        onTogglePacked={onTogglePacked}
        onToggleNotNeeded={onToggleNotNeeded}
      />
    </MantineProvider>,
  );
  return { ...utils, onTogglePacked, onToggleNotNeeded };
}

// Mantine's Collapse keeps content mounted but `inert`/`display: none` while
// closed, so role-based queries only resolve after the panel actually opens.
async function openRow(name = "Clothing") {
  fireEvent.click(screen.getByText(name));
  await waitFor(() => screen.getByRole("checkbox", { name: "Rain jacket" }));
}

describe("header", () => {
  it("renders the category name", () => {
    renderRow();
    expect(screen.getByText("Clothing")).toBeInTheDocument();
  });

  it("renders the packed/total count for active items, excluding not-needed items", () => {
    renderRow();
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("renders a 'not needed' badge when the category has excluded items", () => {
    renderRow();
    expect(screen.getByText("1 not needed")).toBeInTheDocument();
  });

  it("does not render the badge when nothing is excluded", () => {
    renderRow(
      category({
        items: [
          makeItem({ id: "1", packed: true }),
          makeItem({ id: "2", packed: false }),
        ],
      }),
    );
    expect(screen.queryByText(/not needed$/)).not.toBeInTheDocument();
  });
});

describe("status dot", () => {
  function dot(container: HTMLElement) {
    return container.querySelector("span[aria-hidden]") as HTMLElement;
  }

  it("is bark-brown when nothing is packed", () => {
    const { container } = renderRow(
      category({
        items: [
          makeItem({ id: "1", packed: false }),
          makeItem({ id: "2", packed: false }),
        ],
      }),
    );
    expect(dot(container).style.background).toBe(
      "var(--mantine-color-bark-brown-6)",
    );
  });

  it("is trail-dust when some, but not all, active items are packed", () => {
    const { container } = renderRow();
    expect(dot(container).style.background).toBe(
      "var(--mantine-color-trail-dust-6)",
    );
  });

  it("is trail-green when every active item is packed", () => {
    const { container } = renderRow(
      category({
        items: [
          makeItem({ id: "1", packed: true }),
          makeItem({ id: "2", packed: true }),
          makeItem({ id: "3", packed: false, notNeeded: true }),
        ],
      }),
    );
    expect(dot(container).style.background).toBe(
      "var(--mantine-color-trail-green-6)",
    );
  });
});

describe("expanding", () => {
  it("reveals a checkbox row for each active item, but not the excluded one", async () => {
    renderRow();
    await openRow();
    expect(
      screen.getByRole("checkbox", { name: "Rain jacket" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Fleece" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Sun hat" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("checkbox", { name: "Gloves" }),
    ).not.toBeInTheDocument();
  });

  it("shows the excluded items toggle with its count", () => {
    renderRow();
    expect(
      screen.getByText("Not needed for this trip (1)"),
    ).toBeInTheDocument();
  });
});

describe("toggling an item", () => {
  it("calls onTogglePacked with the item id and new checked state", async () => {
    const { onTogglePacked } = renderRow();
    await openRow();
    fireEvent.click(screen.getByRole("checkbox", { name: "Sun hat" }));
    expect(onTogglePacked).toHaveBeenCalledWith("3", true);
  });
});

describe("multi-list categories", () => {
  it("shows a source list badge on items when the category spans more than one list", () => {
    renderRow(
      category({
        items: [
          makeItem({
            id: "1",
            name: "Stove",
            listId: 101,
            listName: "Wonderland Backpacking Kit",
          }),
          makeItem({
            id: "2",
            name: "Pot",
            listId: 102,
            listName: "Cook & Food Kit",
          }),
        ],
      }),
    );
    expect(screen.getByText("Cook & Food Kit")).toBeInTheDocument();
  });

  it("does not show a source badge when every item is from the same list", () => {
    renderRow();
    expect(
      screen.queryByText("Wonderland Backpacking Kit"),
    ).not.toBeInTheDocument();
  });
});
