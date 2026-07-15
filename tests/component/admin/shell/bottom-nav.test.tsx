import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "bun:test";
import { Router } from "wouter";

import BottomNav from "$/frontend/admin/shell/bottom-nav";

function renderBottomNav(path = "/console") {
  return render(
    <MantineProvider>
      <Router hook={() => [path, () => {}]}>
        <BottomNav />
      </Router>
    </MantineProvider>,
  );
}

it("shows the primary nav items in the bottom bar", () => {
  renderBottomNav();

  expect(screen.getByText("Home")).toBeInTheDocument();
  expect(screen.getByText("User Search")).toBeInTheDocument();
  expect(screen.getByText("Audit Log")).toBeInTheDocument();
  expect(screen.getByText("Queues")).toBeInTheDocument();
  expect(screen.getByText("More")).toBeInTheDocument();
});

describe("the More drawer", () => {
  it("opens to reveal the overflow items when More is tapped", async () => {
    renderBottomNav();

    fireEvent.click(screen.getByText("More"));

    await waitFor(() => screen.getByText("Demo Account"));
    expect(screen.getByText("Feature Flags")).toBeInTheDocument();
  });

  it("does not show overflow items before More is tapped", () => {
    renderBottomNav();

    expect(screen.queryByText("Demo Account")).not.toBeInTheDocument();
  });
});
