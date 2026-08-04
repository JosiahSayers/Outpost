import GearProgress from "$/frontend/packing-list/section/gear-progress";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function gear(
  overrides: Partial<ClientGearInventoryItem> = {},
): ClientGearInventoryItem {
  return {
    id: "gear-1",
    name: "Copper Spur UL2",
    quantity: 1,
    grams: 690,
    category: { id: "cat-1", name: "Shelter", public: false },
    ...overrides,
  };
}

function item(
  overrides: Partial<ClientPackingListItem> = {},
): ClientPackingListItem {
  return {
    id: "item-1",
    name: "Tent",
    optional: false,
    quantity: 1,
    sortPosition: 1,
    trackGearAssignment: true,
    assignedGear: null,
    ...overrides,
  };
}

function renderProgress(items: ClientPackingListItem[]) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <GearProgress listId="list-1" sectionId="section-1" items={items} />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("GearProgress", () => {
  it("spells out the invitation while nothing has been assigned", () => {
    renderProgress([item({ id: "a" }), item({ id: "b" })]);

    // A bare "0 of 2" teaches nothing; this is the state an imported or
    // copied list opens in, so it has to carry the word.
    expect(screen.getByText("0 of 2 assigned")).toBeInTheDocument();
  });

  it("shows progress once some gear is assigned", () => {
    renderProgress([
      item({ id: "a", assignedGear: gear() }),
      item({ id: "b" }),
      item({ id: "c" }),
    ]);

    expect(screen.getByText(/^1 of 3/)).toBeInTheDocument();
  });

  it("retires the fraction once every item is decided", () => {
    renderProgress([
      item({ id: "a", assignedGear: gear({ grams: 1000 }) }),
      item({ id: "b", assignedGear: gear({ id: "gear-2", grams: 500 }) }),
    ]);

    expect(screen.queryByText(/of 2/)).not.toBeInTheDocument();
  });

  it("says so when the section has nothing to report", () => {
    renderProgress([]);

    expect(screen.queryByText(/assigned/)).not.toBeInTheDocument();
  });
});
