import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { Router } from "wouter";

function renderComponent() {
  render(
    <MantineProvider>
      <Router hook={() => ["/trips/trip-1", () => {}]}>
        <BackToDashboardLink />
      </Router>
    </MantineProvider>,
  );
}

describe("BackToDashboardLink", () => {
  it("renders a link labeled 'Back to Dashboard'", () => {
    renderComponent();
    expect(
      screen.getByRole("link", { name: /Back to Dashboard/ }),
    ).toBeInTheDocument();
  });

  it("links to /dashboard", () => {
    renderComponent();
    expect(
      screen.getByRole("link", { name: /Back to Dashboard/ }),
    ).toHaveAttribute("href", "/dashboard");
  });
});
