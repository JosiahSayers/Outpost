import ItemList from "$/frontend/packing-list/section/item-list";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onReorder = mock(() => {});
const onToggleOptional = mock(() => {});
const openItem = mock(() => {});

const items: ClientPackingListItem[] = [
  {
    id: "1",
    name: "Sleeping bag",
    optional: false,
    quantity: 1,
    sortPosition: 1,
    assignedGear: null,
  },
  {
    id: "2",
    name: "Tent",
    optional: false,
    quantity: 1,
    sortPosition: 2,
    assignedGear: null,
  },
];

function renderList(editable: boolean) {
  render(
    <MantineProvider>
      <PackingListProvider
        value={{ editable, openItem: editable ? openItem : undefined }}
      >
        <ItemList
          items={items}
          sectionId="section-1"
          onReorder={onReorder}
          onToggleOptional={onToggleOptional}
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

  it("clicking an item hands it to the drawer", () => {
    fireEvent.click(screen.getByText("Sleeping bag"));
    expect(openItem).toHaveBeenCalledWith("section-1", items[0]);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
