import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "bun:test";
import { mockHealthFetch } from "../../../helpers/mock-health-fetch";

import ToolGrid from "$/frontend/admin/overview/tool-grid";

let restoreFetch: () => void;

beforeEach(() => {
  restoreFetch = mockHealthFetch();
});

afterEach(() => {
  restoreFetch();
});

function renderGrid() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <ToolGrid />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

it("renders a card for every tool except Overview", () => {
  renderGrid();

  expect(screen.queryByText("Overview")).not.toBeInTheDocument();
  expect(screen.getByText("User Search")).toBeInTheDocument();
  expect(screen.getByText("Audit Log")).toBeInTheDocument();
  expect(screen.getByText("Demo Account")).toBeInTheDocument();
  expect(screen.getByText("Queues")).toBeInTheDocument();
  expect(screen.getByText("Feature Flags")).toBeInTheDocument();
});

it("labels the not-yet-built tools as Soon and leaves shipped tools unbadged", () => {
  renderGrid();

  expect(screen.queryByText("Up next")).not.toBeInTheDocument();
  expect(screen.getAllByText("Soon").length).toBe(2);
});

it("groups tools with a section under a Support or System heading", () => {
  renderGrid();

  expect(screen.getByText("Support")).toBeInTheDocument();
  expect(screen.getByText("System")).toBeInTheDocument();
});

it("renders the sectionless tool ahead of the grouped sections", () => {
  renderGrid();

  const position = (text: string) =>
    screen.getByText(text).compareDocumentPosition(screen.getByText("Support"));

  // DOCUMENT_POSITION_FOLLOWING (4) means "Support" comes after the given node.
  expect(position("User Search") & Node.DOCUMENT_POSITION_FOLLOWING).toBe(4);
});
