import UpcomingTrips from "$/frontend/dashboard/upcoming-trips";
import type { Trip } from "$/frontend/dashboard/types";
import { tripKeys } from "$/frontend/utils/api/trip";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";
import { Router } from "wouter";

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "1",
    name: "Pacific Crest Trail Section",
    trail: "Pacific Crest Trail",
    location: "Sierra Nevada, CA",
    start: "2026-08-01T12:00:00.000Z",
    end: "2026-08-10T12:00:00.000Z",
    status: "planned",
    ...overrides,
  };
}

function renderComponent(trips: Trip[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(tripKeys.all, trips);
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/dashboard", () => {}]}>
          <UpcomingTrips />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
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

describe("when all trips are finished or cancelled", () => {
  beforeEach(() =>
    renderComponent([
      makeTrip({ id: "1", name: "Old Hike", status: "finished" }),
      makeTrip({ id: "2", name: "Scrapped Hike", status: "cancelled" }),
    ]),
  );

  it("shows the empty state since finished/cancelled trips are excluded", () => {
    expect(
      screen.getByText(
        "No upcoming trips. Start planning your next adventure!",
      ),
    ).toBeInTheDocument();
  });

  it("does not render a card for the excluded trips", () => {
    expect(screen.queryByText("Old Hike")).not.toBeInTheDocument();
    expect(screen.queryByText("Scrapped Hike")).not.toBeInTheDocument();
  });
});

describe("when there are active trips", () => {
  const trips = [
    makeTrip({ id: "1", name: "John Muir Trail", status: "in_progress" }),
    makeTrip({ id: "2", name: "Wonderland Trail", status: "planned" }),
    makeTrip({ id: "3", name: "Finished Hike", status: "finished" }),
  ];

  beforeEach(() => renderComponent(trips));

  it("renders a card for each active trip", () => {
    expect(screen.getByText("John Muir Trail")).toBeInTheDocument();
    expect(screen.getByText("Wonderland Trail")).toBeInTheDocument();
  });

  it("does not render a card for finished trips", () => {
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
