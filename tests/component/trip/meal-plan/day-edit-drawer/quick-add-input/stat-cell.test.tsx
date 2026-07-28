import StatCell from "$/frontend/trip/meal-plan/day-edit-drawer/quick-add-input/stat-cell";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, it } from "bun:test";

function renderCell(label: string, value: string | null) {
  render(
    <MantineProvider>
      <StatCell label={label} value={value} />
    </MantineProvider>,
  );
}

it("renders the label", () => {
  renderCell("Calories", "890");
  expect(screen.getByText("Calories")).toBeInTheDocument();
});

it("renders the value", () => {
  renderCell("Calories", "890");
  expect(screen.getByText("890")).toBeInTheDocument();
});

it("renders a dash when the value is null", () => {
  renderCell("Water", null);
  expect(screen.getByText("—")).toBeInTheDocument();
});
