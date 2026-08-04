import SortableItemList from "$/frontend/packing-list/section/sortable-item-list";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, mock } from "bun:test";

const onReorder = mock(() => {});
const onToggleOptional = mock(() => {});

const items: ClientPackingListItem[] = [
  {
    id: "1",
    name: "Sleeping bag",
    optional: false,
    quantity: 1,
    sortPosition: 1,
    trackGearAssignment: true,
    assignedGear: null,
  },
  {
    id: "2",
    name: "Tent",
    optional: false,
    quantity: 1,
    sortPosition: 2,
    trackGearAssignment: true,
    assignedGear: null,
  },
];

beforeEach(() => {
  render(
    <MantineProvider>
      <SortableItemList
        items={items}
        sectionId="section-1"
        onReorder={onReorder}
        onToggleOptional={onToggleOptional}
      />
    </MantineProvider>,
  );
});

it("renders each item name", () => {
  expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  expect(screen.getByText("Tent")).toBeInTheDocument();
});

it("never edits in place — naming happens in the item drawer", () => {
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
});
