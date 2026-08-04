import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import EditableItemRow from "$/frontend/packing-list/section/editable-item-row";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onToggleOptional = mock(() => {});
const openItem = mock(() => {});

const baseItem: ClientPackingListItem = {
  id: "1",
  name: "Sleeping bag",
  optional: false,
  quantity: 1,
  sortPosition: 1,
  trackGearAssignment: true,
  assignedGear: null,
};

const quilt: ClientGearInventoryItem = {
  id: "gear-1",
  name: "REI Co-op Magma 850 Down Quilt",
  quantity: 1,
  grams: 550,
  category: { id: "cat-1", name: "Sleep system", public: false },
};

function renderRow(item = baseItem, editable = true) {
  render(
    <MantineProvider>
      <PackingListProvider
        value={{ editable, openItem: editable ? openItem : undefined }}
      >
        <DndContext>
          <SortableContext
            items={[item.id]}
            strategy={verticalListSortingStrategy}
          >
            <EditableItemRow
              item={item}
              sectionId="section-1"
              onToggleOptional={onToggleOptional}
            />
          </SortableContext>
        </DndContext>
      </PackingListProvider>
    </MantineProvider>,
  );
}

// happy-dom doesn't compute accessible names from aria-label, so locate
// elements by the attribute directly.
function byLabel(label: string) {
  return document.querySelector(`[aria-label="${label}"]`);
}

beforeEach(() => {
  onToggleOptional.mockReset();
  openItem.mockReset();
});

describe("the row as a whole", () => {
  it("renders the item name", () => {
    renderRow();
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  });

  it("opens the item drawer when tapped", () => {
    renderRow();

    fireEvent.click(byLabel("Edit Sleeping bag")!);

    expect(openItem).toHaveBeenCalledWith("section-1", baseItem);
  });

  it("opens the item drawer from the keyboard", () => {
    renderRow();

    fireEvent.keyDown(byLabel("Edit Sleeping bag")!, { key: "Enter" });

    expect(openItem).toHaveBeenCalledWith("section-1", baseItem);
  });

  it("does not edit in place any more", () => {
    renderRow();

    fireEvent.click(screen.getByText("Sleeping bag"));

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("is inert on a read-only list", () => {
    renderRow(baseItem, false);

    expect(byLabel("Edit Sleeping bag")).not.toBeInTheDocument();
  });
});

describe("controls that stay on the row", () => {
  it("keeps a drag handle for reordering", () => {
    renderRow();
    expect(byLabel("Reorder Sleeping bag")).toBeInTheDocument();
  });

  it("toggles optional without opening the drawer", () => {
    renderRow({ ...baseItem, optional: true });

    fireEvent.click(screen.getByText("optional"));

    expect(onToggleOptional).toHaveBeenCalledTimes(1);
    // The badge is a quick repeated pass down a list; it must not cost a
    // drawer round-trip.
    expect(openItem).not.toHaveBeenCalled();
  });

  it("does not open the drawer when the drag handle is clicked", () => {
    renderRow();

    fireEvent.click(byLabel("Reorder Sleeping bag")!);

    expect(openItem).not.toHaveBeenCalled();
  });
});

describe("gear state", () => {
  it("marks a row that still owes a gear decision", () => {
    renderRow();
    expect(byLabel("No gear assigned")).toBeInTheDocument();
  });

  it("shows the gear name once assigned, without hovering", () => {
    renderRow({ ...baseItem, assignedGear: quilt });

    expect(
      screen.getByText("REI Co-op Magma 850 Down Quilt"),
    ).toBeInTheDocument();
    expect(byLabel("No gear assigned")).not.toBeInTheDocument();
  });

  it("drops the marker once the item is marked as not tracked", () => {
    renderRow({ ...baseItem, trackGearAssignment: false });

    // A dismissed row goes back to looking exactly like it did before the
    // feature existed.
    expect(byLabel("No gear assigned")).not.toBeInTheDocument();
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  });

  it("does not mark rows on a read-only list", () => {
    renderRow(baseItem, false);
    expect(byLabel("No gear assigned")).not.toBeInTheDocument();
  });
});
