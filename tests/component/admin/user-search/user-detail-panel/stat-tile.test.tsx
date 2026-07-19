import StatTile from "$/frontend/admin/user-search/user-detail-panel/stat-tile";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, it } from "bun:test";

function renderTile(label: string, value: number) {
  render(
    <MantineProvider>
      <StatTile label={label} value={value} />
    </MantineProvider>,
  );
}

it("renders the label", () => {
  renderTile("Trips", 14);
  expect(screen.getByText("Trips")).toBeInTheDocument();
});

it("renders the value", () => {
  renderTile("Trips", 14);
  expect(screen.getByText("14")).toBeInTheDocument();
});

it("renders a zero value", () => {
  renderTile("Active Sessions", 0);
  expect(screen.getByText("0")).toBeInTheDocument();
});
