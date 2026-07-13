import TripCard from "$/frontend/dashboard/trip-card";
import type { ClientTrip } from "$/transformers/trip";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";

const baseTrip: ClientTrip = {
  id: "1",
  name: "Olympic Peninsula Loop",
  trail: "Olympic National Park Loop",
  location: "Olympic National Park, WA",
  // Use noon UTC so date formatting is stable across US timezones
  start: "2026-07-15T12:00:00.000Z",
  end: "2026-07-22T12:00:00.000Z",
  status: "planning",
};

function renderCard(trip: ClientTrip = baseTrip) {
  render(
    <MantineProvider>
      <TripCard trip={trip} />
    </MantineProvider>,
  );
}

describe("trip details", () => {
  beforeEach(() => renderCard());

  it("renders the trip name as a heading", () => {
    expect(
      screen.getByRole("heading", { name: "Olympic Peninsula Loop" }),
    ).toBeInTheDocument();
  });

  it("renders the trip location", () => {
    expect(screen.getByText("Olympic National Park, WA")).toBeInTheDocument();
  });

  it("renders the formatted date range", () => {
    expect(screen.getByText("Jul 15 – Jul 22, 2026")).toBeInTheDocument();
  });

  it("renders a 'View Trip' link to the trip's page", () => {
    const link = screen.getByRole("link", { name: "View Trip" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/trips/1");
  });
});

describe("missing optional fields", () => {
  it("shows a fallback when the trip has no location", () => {
    renderCard({ ...baseTrip, location: null });
    expect(
      screen.queryByText("Olympic National Park, WA"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Location TBD")).toBeInTheDocument();
  });

  it("shows a fallback when the trip has no dates", () => {
    renderCard({ ...baseTrip, start: null, end: null });
    expect(screen.getByText("Dates TBD")).toBeInTheDocument();
  });
});

describe("status badge", () => {
  it("renders 'Planning' for planning trips", () => {
    renderCard({ ...baseTrip, status: "planning" });
    expect(screen.getByText("Planning")).toBeInTheDocument();
  });

  it("renders 'In Progress' for in-progress trips", () => {
    renderCard({ ...baseTrip, status: "in_progress" });
    expect(screen.getByText("In Progress")).toBeInTheDocument();
  });

  it("renders 'Completed' for finished trips", () => {
    renderCard({ ...baseTrip, status: "finished" });
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders 'Cancelled' for cancelled trips", () => {
    renderCard({ ...baseTrip, status: "cancelled" });
    expect(screen.getByText("Cancelled")).toBeInTheDocument();
  });

  it("renders 'Postponed' for postponed trips", () => {
    renderCard({ ...baseTrip, status: "postponed" });
    expect(screen.getByText("Postponed")).toBeInTheDocument();
  });
});
