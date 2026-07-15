import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { Router } from "wouter";

import Sidebar from "$/frontend/admin/shell/sidebar";

function renderSidebar(path = "/console") {
  return render(
    <MantineProvider>
      <Router hook={() => [path, () => {}]}>
        <Sidebar />
      </Router>
    </MantineProvider>,
  );
}

it("renders every nav item's label", () => {
  renderSidebar();

  expect(screen.getByText("Overview")).toBeInTheDocument();
  expect(screen.getByText("User Search")).toBeInTheDocument();
  expect(screen.getByText("Audit Log")).toBeInTheDocument();
  expect(screen.getByText("Demo Account")).toBeInTheDocument();
  expect(screen.getByText("Queues")).toBeInTheDocument();
  expect(screen.getByText("Feature Flags")).toBeInTheDocument();
});

it("groups sectioned items under Support and System headings", () => {
  renderSidebar();

  expect(screen.getByText("Support")).toBeInTheDocument();
  expect(screen.getByText("System")).toBeInTheDocument();
});

it("marks items after the current route as coming soon with a badge", () => {
  renderSidebar();

  expect(screen.getAllByText("Soon").length).toBeGreaterThan(0);
});

describe("active state", () => {
  it("marks the item matching the current route as active", () => {
    renderSidebar("/console");

    const overviewLink = screen.getByRole("link", { name: /Overview/ });
    expect(overviewLink).toHaveAttribute("data-active", "true");
  });

  it("does not mark other items as active", () => {
    renderSidebar("/console");

    const auditLogLink = screen.getByRole("link", { name: /Audit Log/ });
    expect(auditLogLink).not.toHaveAttribute("data-active");
  });
});
