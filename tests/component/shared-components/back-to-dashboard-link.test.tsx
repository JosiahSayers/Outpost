import BackToDashboardLink from "$/frontend/shared-components/back-to-dashboard-link";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { Router } from "wouter";
import { mockHealthFetch } from "../../helpers/mock-health-fetch";

let restoreFetch: () => void;

beforeEach(() => {
  restoreFetch = mockHealthFetch();
});

afterEach(() => {
  restoreFetch();
});

function renderComponent() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <Router hook={() => ["/trips/trip-1", () => {}]}>
          <BackToDashboardLink />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
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
