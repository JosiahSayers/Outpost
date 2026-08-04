import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import EditableItemRow from "$/frontend/packing-list/section/editable-item-row";
import {
  resetGearTrackedMock,
  setGearTrackedMock,
} from "$/frontend/utils/api/gear-assignment";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { DndContext } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onToggleOptional = mock(() => {});
const onEdit = mock(() => {});
const onDelete = mock(() => {});
const openAssignGear = mock(() => {});

const baseItem: ClientPackingListItem = {
  id: "1",
  name: "Sleeping bag",
  optional: false,
  quantity: 1,
  sortPosition: 1,
  assignedGear: null,
};

const quilt: ClientGearInventoryItem = {
  id: "gear-1",
  name: "REI Co-op Magma 850 Down Quilt",
  quantity: 1,
  grams: 550,
  category: { id: "cat-1", name: "Sleep system", public: false },
};

function renderRow(item = baseItem, overrides: { autoEdit?: boolean } = {}) {
  render(
    <MantineProvider>
      <PackingListProvider value={{ editable: true, openAssignGear }}>
        <DndContext>
          <SortableContext
            items={[item.id]}
            strategy={verticalListSortingStrategy}
          >
            <EditableItemRow
              item={item}
              sectionId="section-1"
              onToggleOptional={onToggleOptional}
              onEdit={onEdit}
              onDelete={onDelete}
              autoEdit={false}
              {...overrides}
            />
          </SortableContext>
        </DndContext>
      </PackingListProvider>
    </MantineProvider>,
  );
}

// happy-dom doesn't compute accessible names from aria-label on icon-only
// buttons, so locate them by the attribute directly.
function byLabel(label: string) {
  return document.querySelector(`[aria-label="${label}"]`);
}

beforeEach(() => {
  onToggleOptional.mockReset();
  onEdit.mockReset();
  onDelete.mockReset();
  openAssignGear.mockReset();
  resetGearTrackedMock();
});

describe("in view mode", () => {
  beforeEach(() => renderRow());

  it("renders the item name", () => {
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  });

  it("does not show an edit input", () => {
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("clicking the row enters edit mode", () => {
    fireEvent.click(screen.getByText("Sleeping bag"));
    expect(
      screen.getByRole("textbox", { name: "Item name" }),
    ).toBeInTheDocument();
  });
});

describe("when autoEdit is true", () => {
  it("starts in edit mode immediately", () => {
    renderRow(baseItem, { autoEdit: true });
    expect(
      screen.getByRole("textbox", { name: "Item name" }),
    ).toBeInTheDocument();
  });
});

describe("in edit mode", () => {
  beforeEach(() => {
    renderRow();
    fireEvent.click(screen.getByText("Sleeping bag"));
  });

  it("shows an input pre-filled with the item name", () => {
    expect(screen.getByRole("textbox", { name: "Item name" })).toHaveValue(
      "Sleeping bag",
    );
  });

  it("pressing Enter commits and calls onEdit with the updated item", () => {
    fireEvent.change(screen.getByRole("textbox", { name: "Item name" }), {
      target: { value: "Sleeping bag liner" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Item name" }), {
      key: "Enter",
    });
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Sleeping bag liner" }),
    );
  });

  it("pressing Escape cancels without calling onEdit", () => {
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Item name" }), {
      key: "Escape",
    });
    expect(onEdit).not.toHaveBeenCalled();
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  });
});

describe("delete flow", () => {
  beforeEach(() => renderRow());

  it("clicking the trash button opens a confirmation modal", async () => {
    fireEvent.click(byLabel("Delete item")!);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Delete item?" }),
      ).toBeInTheDocument(),
    );
  });

  it("confirming in the modal calls onDelete", async () => {
    fireEvent.click(byLabel("Delete item")!);
    await waitFor(() => screen.getByRole("button", { name: "Delete" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});

describe("optional badge", () => {
  it("is visible for optional items", () => {
    renderRow({ ...baseItem, optional: true });
    expect(screen.getByText("optional")).toBeInTheDocument();
  });

  it("clicking the badge calls onToggleOptional", () => {
    renderRow({ ...baseItem, optional: true });
    fireEvent.click(screen.getByText("optional"));
    expect(onToggleOptional).toHaveBeenCalledTimes(1);
  });
});

describe("gear assignment", () => {
  it("offers an assign target on an item that has no gear yet", () => {
    renderRow();

    // Never hover-gated: on a list where nothing is assigned this button is
    // the only sign the feature exists.
    expect(byLabel("Assign gear to Sleeping bag")).toBeInTheDocument();
  });

  it("opens the drawer for its own section and item", () => {
    renderRow();

    fireEvent.click(byLabel("Assign gear to Sleeping bag")!);

    expect(openAssignGear).toHaveBeenCalledWith("section-1", baseItem);
  });

  it("shows the gear name and weight once assigned, without hovering", () => {
    renderRow({ ...baseItem, assignedGear: quilt });

    expect(
      screen.getByText("REI Co-op Magma 850 Down Quilt"),
    ).toBeInTheDocument();
  });

  it("drops the assign target once gear is assigned", () => {
    renderRow({ ...baseItem, assignedGear: quilt });

    expect(byLabel("Assign gear to Sleeping bag")).not.toBeInTheDocument();
  });

  it("drops the assign target once the item is marked as not tracked", () => {
    setGearTrackedMock({ [baseItem.id]: false });
    renderRow();

    // A dismissed row goes back to looking exactly like it did before the
    // feature existed.
    expect(byLabel("Assign gear to Sleeping bag")).not.toBeInTheDocument();
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  });

  it("does not offer gear controls on a read-only list", () => {
    render(
      <MantineProvider>
        <PackingListProvider value={{ editable: false }}>
          <DndContext>
            <SortableContext
              items={[baseItem.id]}
              strategy={verticalListSortingStrategy}
            >
              <EditableItemRow
                item={baseItem}
                sectionId="section-1"
                onToggleOptional={onToggleOptional}
                onEdit={onEdit}
                onDelete={onDelete}
                autoEdit={false}
              />
            </SortableContext>
          </DndContext>
        </PackingListProvider>
      </MantineProvider>,
    );

    expect(byLabel("Assign gear to Sleeping bag")).not.toBeInTheDocument();
  });
});
