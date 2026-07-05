import UpcomingTrips from "$/frontend/dashboard/upcoming-trips";
import { tripKeys } from "$/frontend/utils/api/trip";
import type { ClientTrip } from "$/transformers/trip";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

function makeTrip(overrides: Partial<ClientTrip> = {}): ClientTrip {
  return {
    id: "1",
    name: "Pacific Crest Trail Section",
    trail: "Pacific Crest Trail",
    location: "Sierra Nevada, CA",
    start: "2026-08-01T12:00:00.000Z",
    end: "2026-08-10T12:00:00.000Z",
    status: "planning",
    ...overrides,
  };
}

function renderComponent(trips: ClientTrip[], total = trips.length) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(tripKeys.all, { trips, total, pageSize: 3 });
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/dashboard", () => {}]}>
          <UpcomingTrips />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("when there are no active trips", () => {
  beforeEach(() => renderComponent([], 0));

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

  it("does not render the 'View all trips' button", () => {
    expect(
      screen.queryByRole("button", { name: "View all trips" }),
    ).not.toBeInTheDocument();
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
    makeTrip({ id: "2", name: "Wonderland Trail", status: "planning" }),
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
  beforeEach(() => renderComponent([], 0));

  it("renders a 'New Trip' button", () => {
    expect(
      screen.getByRole("button", { name: "New Trip" }),
    ).toBeInTheDocument();
  });
});

describe("when there are more trips beyond the initial preview", () => {
  const previewTrips = [
    makeTrip({ id: "1", name: "John Muir Trail", status: "planning" }),
    makeTrip({ id: "2", name: "Wonderland Trail", status: "planning" }),
    makeTrip({ id: "3", name: "Teton Crest Trail", status: "planning" }),
  ];

  function jsonResponse(body: unknown) {
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  beforeEach(() => {
    global.fetch = mock((url: string) => {
      const parsed = new URL(url, "http://localhost");
      const skip = Number(parsed.searchParams.get("skip"));
      if (skip === 3) {
        return jsonResponse({
          trips: [
            makeTrip({ id: "4", name: "Long Trail", status: "planning" }),
            makeTrip({
              id: "5",
              name: "Superior Hiking Trail",
              status: "planning",
            }),
          ],
          total: 12,
          pageSize: 6,
        });
      }
      return jsonResponse({
        trips: [
          makeTrip({ id: "10", name: "Colorado Trail", status: "planning" }),
        ],
        total: 12,
        pageSize: 6,
      });
    }) as unknown as typeof fetch;
  });

  it("renders only the initial preview trips before expanding", () => {
    renderComponent(previewTrips, 12);
    expect(
      screen.getByRole("heading", { name: "John Muir Trail" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Long Trail" }),
    ).not.toBeInTheDocument();
  });

  it("renders the 'View all trips' button", () => {
    renderComponent(previewTrips, 12);
    expect(
      screen.getByRole("button", { name: "View all trips" }),
    ).toBeInTheDocument();
  });

  it("fetches and shows the next page of trips after clicking 'View all trips'", async () => {
    renderComponent(previewTrips, 12);
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Long Trail" }),
      ).toBeInTheDocument(),
    );
  });

  it("changes button text to 'View less' after clicking 'View all trips'", () => {
    renderComponent(previewTrips, 12);
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    expect(
      screen.getByRole("button", { name: "View less" }),
    ).toBeInTheDocument();
  });

  it("collapses back after clicking 'View less'", async () => {
    renderComponent(previewTrips, 12);
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Long Trail" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "View less" }));
    expect(
      screen.queryByRole("heading", { name: "Long Trail" }),
    ).not.toBeInTheDocument();
  });

  it("renders pagination controls to browse additional pages", async () => {
    renderComponent(previewTrips, 12);
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Long Trail" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
  });

  it("fetches the next page of trips when a pagination control is clicked", async () => {
    renderComponent(previewTrips, 12);
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Long Trail" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "2" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Colorado Trail" }),
      ).toBeInTheDocument(),
    );
  });
});
