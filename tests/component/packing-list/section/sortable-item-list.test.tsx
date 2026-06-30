import SortableItemList from "$/frontend/packing-list/section/sortable-item-list";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, mock } from "bun:test";

const onReorder = mock(() => {});
const onToggleOptional = mock(() => {});
const onEditItem = mock(() => {});
const onDeleteItem = mock(() => {});

const items: ClientPackingListItem[] = [
  {
    id: 1,
    name: "Sleeping bag",
    optional: false,
    quantity: 1,
    sortPosition: 1,
  },
  { id: 2, name: "Tent", optional: false, quantity: 1, sortPosition: 2 },
];

beforeEach(() => {
  render(
    <MantineProvider>
      <SortableItemList
        items={items}
        onReorder={onReorder}
        onToggleOptional={onToggleOptional}
        onEditItem={onEditItem}
        onDeleteItem={onDeleteItem}
        autoEditItemId={null}
      />
    </MantineProvider>,
  );
});

it("renders each item name", () => {
  expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  expect(screen.getByText("Tent")).toBeInTheDocument();
});

it("does not render any item in edit mode when autoEditItemId is null", () => {
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
