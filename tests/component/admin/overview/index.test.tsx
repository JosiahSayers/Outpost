import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

import AdminOverview from "$/frontend/admin/overview";

function renderOverview(adminName: string) {
  return render(
    <MantineProvider>
      <AdminOverview adminName={adminName} />
    </MantineProvider>,
  );
}

it("greets the admin by their first name", () => {
  renderOverview("Josiah Sayers");

  expect(
    screen.getByText("Welcome back, Josiah. Here's the state of things."),
  ).toBeInTheDocument();
});

describe("when adminName is blank", () => {
  it("still renders a generic welcome", () => {
    renderOverview("");

    expect(
      screen.getByText("Welcome back. Here's the state of things."),
    ).toBeInTheDocument();
  });
});

it("renders the stat strip and tool grid", () => {
  renderOverview("Josiah Sayers");

  expect(screen.getByText("Total Users")).toBeInTheDocument();
  expect(screen.getByText("Tools")).toBeInTheDocument();
  expect(screen.getByText("User Search")).toBeInTheDocument();
});
