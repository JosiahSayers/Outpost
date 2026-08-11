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

it("groups tools with a section under a Support or System heading", () => {
  render(
    <MantineProvider>
      <ToolGrid />
    </MantineProvider>,
  );

  expect(screen.getByText("Support")).toBeInTheDocument();
  expect(screen.getByText("System")).toBeInTheDocument();
});

it("renders the sectionless tool ahead of the grouped sections", () => {
  render(
    <MantineProvider>
      <ToolGrid />
    </MantineProvider>,
  );

  const position = (text: string) =>
    screen.getByText(text).compareDocumentPosition(screen.getByText("Support"));

  // DOCUMENT_POSITION_FOLLOWING (4) means "Support" comes after the given node.
  expect(position("User Search") & Node.DOCUMENT_POSITION_FOLLOWING).toBe(4);
});
