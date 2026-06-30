import StaticItemRow from "$/frontend/packing-list/section/static-item-row";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";

const baseItem: ClientPackingListItem = {
  id: 1,
  name: "Sleeping bag",
  optional: false,
  quantity: 1,
  sortPosition: 1,
};

function renderRow(item = baseItem) {
  render(
    <MantineProvider>
      <StaticItemRow item={item} />
    </MantineProvider>,
  );
}

describe("StaticItemRow", () => {
  beforeEach(() => renderRow());

  it("renders the item name", () => {
    expect(screen.getByText("Sleeping bag")).toBeInTheDocument();
  });

  it("does not show a quantity when quantity is 1", () => {
    expect(screen.queryByText(/×/)).not.toBeInTheDocument();
  });
});

describe("when quantity is greater than 1", () => {
  it("shows the quantity", () => {
    renderRow({ ...baseItem, quantity: 3 });
    expect(screen.getByText("×3")).toBeInTheDocument();
  });
});
