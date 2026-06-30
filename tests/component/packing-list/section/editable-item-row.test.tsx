import EditableItemRow from "$/frontend/packing-list/section/editable-item-row";
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

const baseItem: ClientPackingListItem = {
  id: 1,
  name: "Sleeping bag",
  optional: false,
  quantity: 1,
  sortPosition: 1,
};

function renderRow(item = baseItem, overrides: { autoEdit?: boolean } = {}) {
  render(
    <MantineProvider>
      <DndContext>
        <SortableContext
          items={[item.id]}
          strategy={verticalListSortingStrategy}
        >
          <EditableItemRow
            item={item}
            onToggleOptional={onToggleOptional}
            onEdit={onEdit}
            onDelete={onDelete}
            autoEdit={false}
            {...overrides}
          />
        </SortableContext>
      </DndContext>
    </MantineProvider>,
  );
}

beforeEach(() => {
  onToggleOptional.mockReset();
  onEdit.mockReset();
  onDelete.mockReset();
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
    // Trash is the second button (after the drag handle); no aria-label on either
    fireEvent.click(screen.getAllByRole("button", { hidden: true })[1]!);
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Delete item?" }),
      ).toBeInTheDocument(),
    );
  });

  it("confirming in the modal calls onDelete", async () => {
    fireEvent.click(screen.getAllByRole("button", { hidden: true })[1]!);
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
