import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { expect, it } from "bun:test";

import ToolGrid from "$/frontend/admin/overview/tool-grid";

it("renders a card for every tool except Overview", () => {
  render(
    <MantineProvider>
      <ToolGrid />
    </MantineProvider>,
  );

  expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  expect(screen.getByText("User Search")).toBeInTheDocument();
  expect(screen.getByText("Audit Log")).toBeInTheDocument();
  expect(screen.getByText("Demo Account")).toBeInTheDocument();
  expect(screen.getByText("Queues")).toBeInTheDocument();
  expect(screen.getByText("Feature Flags")).toBeInTheDocument();
});

it("labels the not-yet-built tools as Soon and leaves shipped tools unbadged", () => {
  render(
    <MantineProvider>
      <ToolGrid />
    </MantineProvider>,
  );

  expect(screen.queryByText("Up next")).not.toBeInTheDocument();
  expect(screen.getAllByText("Soon").length).toBe(3);
});
