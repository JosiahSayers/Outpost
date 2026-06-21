import StandaloneLists from "$/frontend/dashboard/standalone-lists";
import type { StandaloneList } from "$/frontend/dashboard/types";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { Router } from "wouter";

function renderComponent(lists: StandaloneList[]) {
  render(
    <MantineProvider>
      <Router hook={() => ["/dashboard", () => {}]}>
        <StandaloneLists lists={lists} />
      </Router>
    </MantineProvider>,
  );
}

describe("when there are no lists", () => {
  beforeEach(() => renderComponent([]));

  it("renders the section heading", () => {
    expect(
      screen.getByRole("heading", { level: 2, name: "My Packing Lists" }),
    ).toBeInTheDocument();
  });

  it("renders the empty state message", () => {
    expect(
      screen.getByText(
        "No standalone lists yet. Create a list or attach one to a trip.",
      ),
    ).toBeInTheDocument();
  });

  it("renders a 'New List' button", () => {
    expect(
      screen.getByRole("button", { name: "New List" }),
    ).toBeInTheDocument();
  });

  it("renders a 'View all lists' link to /packing-lists", () => {
    const link = screen.getByRole("link", { name: "View all lists" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/packing-lists");
  });
});

describe("when there are lists", () => {
  const lists: StandaloneList[] = [
    { id: 1, name: "Weekend Kit", itemCount: 18, totalWeightKg: 8.4 },
    { id: 2, name: "Emergency Bag", itemCount: 12, totalWeightKg: 4.1 },
  ];

  beforeEach(() => renderComponent(lists));

  it("renders each list by name", () => {
    expect(screen.getByText("Weekend Kit")).toBeInTheDocument();
    expect(screen.getByText("Emergency Bag")).toBeInTheDocument();
  });

  it("renders the item count for each list", () => {
    expect(screen.getByText("18 items")).toBeInTheDocument();
    expect(screen.getByText("12 items")).toBeInTheDocument();
  });

  it("renders the total weight for each list", () => {
    expect(screen.getByText("8.4 kg")).toBeInTheDocument();
    expect(screen.getByText("4.1 kg")).toBeInTheDocument();
  });

  it("renders an 'Export PDF' button for each list", () => {
    expect(screen.getAllByRole("button", { name: "Export PDF" })).toHaveLength(
      2,
    );
  });
});
