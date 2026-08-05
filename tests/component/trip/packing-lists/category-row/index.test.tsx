import CategoryRow from "$/frontend/trip/packing-lists/category-row";
import type { ClientPackingListSection } from "$/transformers/packing-list-section";
import type { ClientTripPackingListItem } from "$/transformers/trip-packing-list/item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

type Section = ClientPackingListSection & {
  items: ClientTripPackingListItem[];
};

function makeItem(
  overrides: Partial<ClientTripPackingListItem> = {},
): ClientTripPackingListItem {
  return {
    id: "item-1",
    name: "Item",
    optional: false,
    quantity: 1,
    sortPosition: 0,
    trackGearAssignment: true,
    assignedGear: null,
    category: null,
    status: { packed: false, notNeeded: false },
    ...overrides,
  };
}

function section(overrides: Partial<Section> = {}): Section {
  return {
    id: "section-1",
    name: "Clothing",
    sortPosition: 0,
    items: [
      makeItem({
        id: "1",
        name: "Rain jacket",
        sortPosition: 0,
        status: { packed: true, notNeeded: false },
      }),
      makeItem({
        id: "2",
        name: "Fleece",
        sortPosition: 1,
        status: { packed: true, notNeeded: false },
      }),
      makeItem({
        id: "3",
        name: "Sun hat",
        sortPosition: 2,
        status: { packed: false, notNeeded: false },
      }),
      makeItem({
        id: "4",
        name: "Gloves",
        sortPosition: 3,
        status: { packed: false, notNeeded: true },
      }),
    ],
    ...overrides,
  };
}

function renderRow(sec: Section = section()) {
  const onTogglePacked = mock();
  const onToggleNotNeeded = mock();
  const utils = render(
    <MantineProvider>
      <CategoryRow
        section={sec}
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
  it("renders the section name", () => {
    renderRow();
    expect(screen.getByText("Clothing")).toBeInTheDocument();
  });

  it("renders the packed/total count for active items, excluding not-needed items", () => {
    renderRow();
    expect(screen.getByText("2/3")).toBeInTheDocument();
  });

  it("renders a 'not needed' badge when the section has excluded items", () => {
    renderRow();
    expect(screen.getByText("1 not needed")).toBeInTheDocument();
  });

  it("does not render the badge when nothing is excluded", () => {
    renderRow(
      section({
        items: [
          makeItem({ id: "1", status: { packed: true, notNeeded: false } }),
          makeItem({ id: "2", status: { packed: false, notNeeded: false } }),
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
      section({
        items: [
          makeItem({ id: "1", status: { packed: false, notNeeded: false } }),
          makeItem({ id: "2", status: { packed: false, notNeeded: false } }),
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
      section({
        items: [
          makeItem({ id: "1", status: { packed: true, notNeeded: false } }),
          makeItem({ id: "2", status: { packed: true, notNeeded: false } }),
          makeItem({
            id: "3",
            status: { packed: false, notNeeded: true },
          }),
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

describe("optional items", () => {
  function sectionWithOptional() {
    return section({
      items: [
        makeItem({
          id: "1",
          name: "Rain jacket",
          sortPosition: 0,
          optional: false,
          status: { packed: false, notNeeded: false },
        }),
        makeItem({
          id: "2",
          name: "Hand warmers",
          sortPosition: 1,
          optional: true,
          status: { packed: false, notNeeded: false },
        }),
      ],
    });
  }

  it("renders an 'Optional' header above optional items", async () => {
    renderRow(sectionWithOptional());
    await openRow();
    expect(screen.getByText("Optional")).toBeInTheDocument();
  });

  it("does not render the 'Optional' header when nothing is optional", async () => {
    renderRow(
      section({
        items: [
          makeItem({ id: "1", optional: false, name: "Rain jacket" }),
          makeItem({ id: "2", optional: false, name: "Fleece" }),
        ],
      }),
    );
    await openRow();
    expect(screen.queryByText("Optional")).not.toBeInTheDocument();
  });

  it("renders required items before the optional item", async () => {
    renderRow(sectionWithOptional());
    await openRow();
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toHaveAccessibleName("Rain jacket");
    expect(checkboxes[1]).toHaveAccessibleName("Hand warmers");
  });
});

describe("item order", () => {
  it("renders items sorted by sortPosition regardless of input order", async () => {
    renderRow(
      section({
        items: [
          makeItem({
            id: "2",
            name: "Second",
            sortPosition: 1,
            status: { packed: false, notNeeded: false },
          }),
          makeItem({
            id: "1",
            name: "First",
            sortPosition: 0,
            status: { packed: false, notNeeded: false },
          }),
        ],
      }),
    );
    fireEvent.click(screen.getByText("Clothing"));
    await waitFor(() => screen.getByRole("checkbox", { name: "First" }));
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes[0]).toHaveAccessibleName("First");
    expect(checkboxes[1]).toHaveAccessibleName("Second");
  });
});
