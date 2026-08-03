import SectionContent from "$/frontend/packing-list/section/section-content";
import { PackingListProvider } from "$/frontend/packing-list/packing-list-context";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import type { ClientPackingListSection } from "$/transformers/packing-list-section";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { useState } from "react";

const onMoveUp = mock(() => {});
const onMoveDown = mock(() => {});
const onRename = mock(() => {});
const onDelete = mock(() => {});
const onEditItem = mock((_item: ClientPackingListItem) => {});
const onDeleteItem = mock((_item: ClientPackingListItem) => {});
const onToggleOptional = mock((_item: ClientPackingListItem) => {});
const onReorderItem = mock(
  (_item: ClientPackingListItem, _sortPosition: number) => {},
);

const requiredItem: ClientPackingListItem = {
  id: "1",
  name: "Sleeping bag",
  optional: false,
  quantity: 1,
  sortPosition: 1,
  assignedGear: null,
};

const optionalItem: ClientPackingListItem = {
  id: "2",
  name: "Camp shoes",
  optional: true,
  quantity: 1,
  sortPosition: 2,
  assignedGear: null,
};

const baseSection: ClientPackingListSection & {
  items: ClientPackingListItem[];
} = {
  id: "1",
  name: "Sleep system",
  sortPosition: 1,
  items: [requiredItem],
};

// `SectionContent` is controlled — items come from the `section` prop (the React
// Query cache in the real app). This wrapper stands in for that owner, applying
// item callbacks to local state so persisted changes flow back through props.
function renderSection(editable: boolean, section = baseSection) {
  function Wrapper() {
    const [items, setItems] = useState(section.items);
    const [autoEditItemId, setAutoEditItemId] = useState<string | null>(null);

    return (
      <MantineProvider>
        <PackingListProvider value={{ editable }}>
          <SectionContent
            section={{ ...section, items }}
            isFirst={false}
            isLast={false}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onRename={onRename}
            onDelete={onDelete}
            autoEdit={false}
            autoEditItemId={autoEditItemId}
            onAddItem={() => {
              const id = crypto.randomUUID();
              setItems((prev) => [
                ...prev,
                {
                  id,
                  name: "New item",
                  optional: false,
                  quantity: 1,
                  sortPosition: prev.length + 1,
                  assignedGear: null,
                },
              ]);
              setAutoEditItemId(id);
            }}
            onEditItem={(updated) => {
              onEditItem(updated);
              setItems((prev) =>
                prev.map((i) => (i.id === updated.id ? updated : i)),
              );
            }}
            onDeleteItem={(item) => {
              onDeleteItem(item);
              setItems((prev) => prev.filter((i) => i.id !== item.id));
            }}
            onToggleOptional={(item) => {
              onToggleOptional(item);
              setItems((prev) =>
                prev.map((i) =>
                  i.id === item.id ? { ...i, optional: !i.optional } : i,
                ),
              );
            }}
            onReorderItem={onReorderItem}
          />
        </PackingListProvider>
      </MantineProvider>
    );
  }

  render(<Wrapper />);
}

beforeEach(() => {
  onMoveUp.mockReset();
  onMoveDown.mockReset();
  onRename.mockReset();
  onDelete.mockReset();
  onEditItem.mockReset();
  onDeleteItem.mockReset();
  onToggleOptional.mockReset();
  onReorderItem.mockReset();
});

describe("section display", () => {
  beforeEach(() => renderSection(false));

  it("renders the section name as a heading", () => {
    expect(
      screen.getByRole("heading", { name: "Sleep system" }),
    ).toBeInTheDocument();
  });

  it("renders required items", () => {
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  });
});

describe("optional items", () => {
  it("does not show the 'Optional' label when there are no optional items", () => {
    renderSection(false, { ...baseSection, items: [requiredItem] });
    expect(screen.queryByText("Optional")).not.toBeInTheDocument();
  });

  it("shows the 'Optional' label and optional item names when optional items exist", () => {
    renderSection(false, {
      ...baseSection,
      items: [requiredItem, optionalItem],
    });
    expect(screen.getByText("Optional")).toBeInTheDocument();
    expect(screen.getByText("Camp shoes")).toBeInTheDocument();
  });
});

describe("'Add item' button", () => {
  it("is not shown when not editable", () => {
    renderSection(false);
    expect(
      screen.queryByRole("button", { name: /add item/i }),
    ).not.toBeInTheDocument();
  });

  it("is shown when editable", () => {
    renderSection(true);
    expect(
      screen.getByRole("button", { name: /add item/i }),
    ).toBeInTheDocument();
  });

  it("clicking it adds a new item in edit mode", () => {
    renderSection(true);
    fireEvent.click(screen.getByRole("button", { name: /add item/i }));
    expect(
      screen.getByRole("textbox", { name: "Item name" }),
    ).toBeInTheDocument();
  });
});

describe("editing an item", () => {
  beforeEach(() => renderSection(true));

  it("clicking an item and committing updates its name in the list", () => {
    fireEvent.click(screen.getByText("Sleeping bag"));
    fireEvent.change(screen.getByRole("textbox", { name: "Item name" }), {
      target: { value: "Sleeping bag liner" },
    });
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Item name" }), {
      key: "Enter",
    });
    expect(onEditItem).toHaveBeenCalled();
    expect(screen.getByText("Sleeping bag liner")).toBeInTheDocument();
  });
});

describe("toggling an item's optional status", () => {
  it("clicking an optional item's badge moves it to the required section", () => {
    // Use a single optional item so getByText("optional") is unambiguous
    renderSection(true, { ...baseSection, items: [optionalItem] });
    fireEvent.click(screen.getByText("optional"));
    expect(onToggleOptional).toHaveBeenCalled();
    expect(screen.queryByText("Optional")).not.toBeInTheDocument();
  });
});
