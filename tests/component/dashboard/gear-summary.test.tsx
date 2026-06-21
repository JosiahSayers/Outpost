import GearSummaryBar from "$/frontend/dashboard/gear-summary";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, mock } from "bun:test";
import { Router } from "wouter";

mock.module("$/frontend/utils/api/gear-inventory", () => ({
  useGearInventory: () => ({
    data: { items: [] },
    isPending: false,
  }),
}));

mock.module("$/frontend/utils/build-gear-summary", () => ({
  buildGearSummary: () => ({
    totalItems: 47,
    totalWeightKg: 12.3,
    categoryCount: 8,
  }),
}));

beforeEach(() => {
  const queryClient = new QueryClient();
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
  expect(screen.getByText("47")).toBeInTheDocument();
});

it("renders the total weight in kg", () => {
  expect(screen.getByText("12.3 kg")).toBeInTheDocument();
});

it("renders the category count", () => {
  expect(screen.getByText("8")).toBeInTheDocument();
});

it("renders a link to the gear inventory", () => {
  const link = screen.getByRole("link", { name: "Manage Gear Inventory →" });
  expect(link).toBeInTheDocument();
  expect(link).toHaveAttribute("href", "/gear");
});
