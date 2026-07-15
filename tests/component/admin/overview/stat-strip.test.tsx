import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, it } from "bun:test";

import StatStrip from "$/frontend/admin/overview/stat-strip";
import { MOCK_ADMIN_STATS } from "$/frontend/admin/overview/mock-data";

it("renders every stat's label, value, and delta", () => {
  render(
    <MantineProvider>
      <StatStrip />
    </MantineProvider>,
  );

  for (const stat of MOCK_ADMIN_STATS) {
    expect(screen.getByText(stat.label)).toBeInTheDocument();
    expect(screen.getByText(stat.value)).toBeInTheDocument();
    expect(screen.getByText(stat.delta)).toBeInTheDocument();
  }
});
