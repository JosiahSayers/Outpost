import UpcomingTrips from "$/frontend/dashboard/upcoming-trips";
import type { Trip } from "$/frontend/dashboard/types";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { Router } from "wouter";

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "1",
    name: "Pacific Crest Trail Section",
    location: "Sierra Nevada, CA",
    startDate: "2026-08-01T12:00:00.000Z",
    endDate: "2026-08-10T12:00:00.000Z",
    status: "upcoming",
    packingLists: [],
    ...overrides,
  };
}

function renderComponent(trips: Trip[]) {
  render(
    <MantineProvider>
      <Router hook={() => ["/dashboard", () => {}]}>
        <UpcomingTrips trips={trips} />
      </Router>
    </MantineProvider>,
  );
}

describe("when there are no active trips", () => {
  beforeEach(() => renderComponent([]));

  it("renders the section heading", () => {
    expect(
      screen.getByRole("heading", { level: 2, name: "Upcoming Trips" }),
    ).toBeInTheDocument();
  });

  it("renders the empty state message", () => {
    expect(
      screen.getByText(
        "No upcoming trips. Start planning your next adventure!",
      ),
    ).toBeInTheDocument();
  });
});

describe("when all trips are completed", () => {
  beforeEach(() =>
    renderComponent([
      makeTrip({ id: "1", name: "Old Hike", status: "completed" }),
    ]),
  );

  it("shows the empty state since completed trips are excluded", () => {
    expect(
      screen.getByText(
        "No upcoming trips. Start planning your next adventure!",
      ),
    ).toBeInTheDocument();
  });

  it("does not render a card for the completed trip", () => {
    expect(screen.queryByText("Old Hike")).not.toBeInTheDocument();
  });
});

describe("when there are active trips", () => {
  const trips = [
    makeTrip({ id: "1", name: "John Muir Trail", status: "upcoming" }),
    makeTrip({ id: "2", name: "Wonderland Trail", status: "planning" }),
    makeTrip({ id: "3", name: "Finished Hike", status: "completed" }),
  ];

  beforeEach(() => renderComponent(trips));

  it("renders a card for each active trip", () => {
    expect(screen.getByText("John Muir Trail")).toBeInTheDocument();
    expect(screen.getByText("Wonderland Trail")).toBeInTheDocument();
  });

  it("does not render a card for completed trips", () => {
    expect(screen.queryByText("Finished Hike")).not.toBeInTheDocument();
  });
});

describe("navigation", () => {
  beforeEach(() => renderComponent([]));

  it("renders a 'New Trip' button", () => {
    expect(
      screen.getByRole("button", { name: "New Trip" }),
    ).toBeInTheDocument();
  });

  it("renders a 'View all trips' link to /trips", () => {
    const link = screen.getByRole("link", { name: "View all trips" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/trips");
  });
});
