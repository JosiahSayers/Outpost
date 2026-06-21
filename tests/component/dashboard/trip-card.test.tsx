import TripCard from "$/frontend/dashboard/trip-card";
import type { Trip } from "$/frontend/dashboard/types";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "bun:test";

const baseTrip: Trip = {
  id: "1",
  name: "Olympic Peninsula Loop",
  location: "Olympic National Park, WA",
  // Use noon UTC so date formatting is stable across US timezones
  startDate: "2026-07-15T12:00:00.000Z",
  endDate: "2026-07-22T12:00:00.000Z",
  status: "planning",
  packingLists: [
    { id: 1, name: "Gear List", itemCount: 24, status: "in-progress" },
    { id: 2, name: "Food Plan", itemCount: 8, status: "complete" },
    { id: 3, name: "First Aid", itemCount: 6, status: "not-started" },
  ],
};

function renderCard(trip: Trip = baseTrip) {
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

  it("renders a 'View Trip' button", () => {
    expect(
      screen.getByRole("button", { name: "View Trip" }),
    ).toBeInTheDocument();
  });
});

describe("packing lists", () => {
  beforeEach(() => renderCard());

  it("renders each packing list name", () => {
    expect(screen.getByText("Gear List")).toBeInTheDocument();
    expect(screen.getByText("Food Plan")).toBeInTheDocument();
    expect(screen.getByText("First Aid")).toBeInTheDocument();
  });

  it("renders the item count for each packing list", () => {
    expect(screen.getByText("24 items")).toBeInTheDocument();
    expect(screen.getByText("8 items")).toBeInTheDocument();
    expect(screen.getByText("6 items")).toBeInTheDocument();
  });

  it("renders nothing when the trip has no packing lists", () => {
    renderCard({ ...baseTrip, packingLists: [] });
    expect(screen.queryByText("items")).not.toBeInTheDocument();
  });
});

describe("status badge", () => {
  it("renders 'Planning' for planning trips", () => {
    renderCard({ ...baseTrip, status: "planning" });
    expect(screen.getByText("Planning")).toBeInTheDocument();
  });

  it("renders 'Upcoming' for upcoming trips", () => {
    renderCard({ ...baseTrip, status: "upcoming" });
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
  });

  it("renders 'Completed' for completed trips", () => {
    renderCard({ ...baseTrip, status: "completed" });
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });
});
