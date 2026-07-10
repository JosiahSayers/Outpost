import GearSummaryBar from "$/frontend/dashboard/gear-summary";
import { gearInventoryKeys } from "$/frontend/utils/api/gear-inventory";
import { transformers } from "$/transformers";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { Router } from "wouter";

function makeClientItem(categoryId: number, quantity: number, grams: number) {
  const item = make("GearInventoryItem", {
    quantity,
    grams,
    gearCategoryId: categoryId,
  });
  return transformers.gearInventoryItem({
    ...item,
    category: make("GearCategory", { id: categoryId }),
  });
}

// 2 categories, 4 total items, 3000g total (6.61 lb under the en-US test
// locale, rolled up from 105.82 oz)
// cat 1: qty=1 @ 500g + qty=2 @ 1000g = 3 items, 2500g
// cat 2: qty=1 @ 500g = 1 item, 500g
const items = [
  makeClientItem(1, 1, 500),
  makeClientItem(1, 2, 1000),
  makeClientItem(2, 1, 500),
];

beforeEach(() => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(gearInventoryKeys.all, { items });
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/dashboard", () => {}]}>
          <GearSummaryBar />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
});

it("renders the total gear item count", () => {
  expect(screen.getByText("4 (3 unique)")).toBeInTheDocument();
});

it("renders the total weight in the locale-detected unit", () => {
  expect(screen.getByText("6.61 lb")).toBeInTheDocument();
});

it("renders the category count", () => {
  expect(screen.getByText("2")).toBeInTheDocument();
});

it("renders a link to the gear inventory", () => {
  const link = screen.getByRole("link", { name: "Manage Gear Inventory →" });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/gear-inventory");
});
