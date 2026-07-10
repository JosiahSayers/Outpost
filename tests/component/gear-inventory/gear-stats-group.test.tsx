import GearStatsGroup from "$/frontend/gear-inventory/gear-stats-group";
import { transformers } from "$/transformers";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";

function makeClientItem(
  categoryId: number,
  categoryName: string,
  quantity: number,
  grams: number,
) {
  return transformers.gearInventoryItem({
    ...make("GearInventoryItem", {
      quantity,
      grams,
      gearCategoryId: categoryId,
    }),
    category: make("GearCategory", { id: categoryId, name: categoryName }),
  });
}

// cat 1: qty=2 @ 500g + qty=1 @ 1000g = 3 items, 2000g
// cat 2: qty=1 @ 500g = 1 item, 500g
// total: 4 items, 3 unique, 2500g (88.18 oz under the en-US test locale), 2 categories
const items = [
  makeClientItem(1, "Shelter", 2, 500),
  makeClientItem(1, "Shelter", 1, 1000),
  makeClientItem(2, "Clothing", 1, 500),
];

describe("with items", () => {
  beforeEach(() => {
    render(
      <MantineProvider>
        <GearStatsGroup items={items} />
      </MantineProvider>,
    );
  });

  it("renders total item count and unique count", () => {
    expect(screen.getByText("4 (3 unique)")).toBeInTheDocument();
  });

  it("renders total weight in the locale-detected unit", () => {
    expect(screen.getByText("88.18 oz")).toBeInTheDocument();
  });

  it("renders category count", () => {
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});

describe("with no items", () => {
  beforeEach(() => {
    render(
      <MantineProvider>
        <GearStatsGroup items={[]} />
      </MantineProvider>,
    );
  });

  it("renders zero item count", () => {
    expect(screen.getByText("0 (0 unique)")).toBeInTheDocument();
  });

  it("renders zero weight", () => {
    expect(screen.getByText("0 oz")).toBeInTheDocument();
  });

  it("renders zero category count", () => {
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});
