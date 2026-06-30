import ItemList from "$/frontend/packing-list/section/item-list";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

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

function renderList(editable: boolean) {
  render(
    <MantineProvider>
      <PackingListProvider value={{ editable }}>
        <ItemList
          items={items}
          onReorder={onReorder}
          onToggleOptional={onToggleOptional}
          onEditItem={onEditItem}
          onDeleteItem={onDeleteItem}
          autoEditItemId={null}
        />
      </PackingListProvider>
    </MantineProvider>,
  );
}

describe("when not editable", () => {
  beforeEach(() => renderList(false));

  it("renders each item name", () => {
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
    expect(screen.getByText("Tent")).toBeInTheDocument();
  });

  it("does not render any inputs", () => {
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("when editable", () => {
  beforeEach(() => renderList(true));

  it("renders each item name", () => {
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
    expect(screen.getByText("Tent")).toBeInTheDocument();
  });

  it("clicking an item enters edit mode", () => {
    fireEvent.click(screen.getByText("Sleeping bag"));
    expect(
      screen.getByRole("textbox", { name: "Item name" }),
    ).toBeInTheDocument();
  });
});
