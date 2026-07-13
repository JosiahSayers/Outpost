import UpcomingTrips from "$/frontend/dashboard/upcoming-trips";
import { tripKeys } from "$/frontend/utils/api/trip";
import type { ClientTrip } from "$/transformers/trip";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

const PAGE_SIZE = 6;

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

// A single paged query backs both the collapsed preview and the expanded
// list, keyed on `skip`/`take`. The first page (`skip: 0`) is what the
// component reads while collapsed and on page 1 once expanded, so seeding it
// is all most tests need. The pagination describe block below drives the
// `skip: 6` fetch itself via a mocked `global.fetch`.
function renderComponent(trips: ClientTrip[], total = trips.length) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(tripKeys.page(0, PAGE_SIZE), {
    trips,
    total,
    pageSize: PAGE_SIZE,
  });
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

describe("when there are no trips", () => {
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

describe("when the trips fit within the preview", () => {
  // The preview is no longer filtered by status: finished and cancelled trips
  // appear in the main grid alongside active ones, up to the preview size.
  const trips = [
    makeTrip({ id: "1", name: "John Muir Trail", status: "in_progress" }),
    makeTrip({ id: "2", name: "Finished Hike", status: "finished" }),
    makeTrip({ id: "3", name: "Scrapped Hike", status: "cancelled" }),
  ];

  beforeEach(() => renderComponent(trips));

  it("renders a card for every trip regardless of status", () => {
    expect(
      screen.getByRole("heading", { name: "John Muir Trail" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Finished Hike" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Scrapped Hike" }),
    ).toBeInTheDocument();
  });

  it("does not show the empty state", () => {
    expect(
      screen.queryByText(
        "No upcoming trips. Start planning your next adventure!",
      ),
    ).not.toBeInTheDocument();
  });

  it("does not render a 'View all trips' button when everything already fits", () => {
    expect(
      screen.queryByRole("button", { name: "View all trips" }),
    ).not.toBeInTheDocument();
  });
});

describe("when there are more trips than fit in the preview", () => {
  const trips = [
    makeTrip({ id: "1", name: "John Muir Trail", status: "in_progress" }),
    makeTrip({ id: "2", name: "Wonderland Trail", status: "planning" }),
    makeTrip({ id: "3", name: "Teton Crest Trail", status: "planning" }),
    makeTrip({ id: "4", name: "Finished Hike", status: "finished" }),
  ];

  beforeEach(() => renderComponent(trips));

  it("renders only the first three trips in the preview", () => {
    expect(
      screen.getByRole("heading", { name: "John Muir Trail" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Wonderland Trail" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Teton Crest Trail" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Finished Hike" }),
    ).not.toBeInTheDocument();
  });

  it("renders a 'View all trips' button", () => {
    expect(
      screen.getByRole("button", { name: "View all trips" }),
    ).toBeInTheDocument();
  });

  it("reveals the remaining trips after clicking 'View all trips'", async () => {
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Finished Hike" }),
      ).toBeInTheDocument(),
    );
  });

  it("changes the button text to 'View less' after expanding", () => {
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    expect(
      screen.getByRole("button", { name: "View less" }),
    ).toBeInTheDocument();
  });

  it("collapses the extra trips again after clicking 'View less'", async () => {
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Finished Hike" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "View less" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Finished Hike" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("does not render pagination controls when everything fits on one page", () => {
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    expect(screen.queryByRole("button", { name: "2" })).not.toBeInTheDocument();
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

describe("when there are multiple pages of trips", () => {
  const firstPage = [
    makeTrip({ id: "1", name: "John Muir Trail", status: "planning" }),
    makeTrip({ id: "2", name: "Wonderland Trail", status: "planning" }),
    makeTrip({ id: "3", name: "Teton Crest Trail", status: "planning" }),
    makeTrip({ id: "4", name: "Long Trail", status: "planning" }),
    makeTrip({ id: "5", name: "Superior Hiking Trail", status: "planning" }),
    makeTrip({ id: "6", name: "Continental Divide Trail", status: "planning" }),
  ];

  function jsonResponse(body: unknown) {
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  beforeEach(() => {
    // The first page is seeded via `renderComponent`; only the second page
    // (skip 6) is fetched, when a pagination control is clicked.
    global.fetch = mock((url: string) => {
      const skip = Number(
        new URL(url, "http://localhost").searchParams.get("skip"),
      );
      if (skip === 6) {
        return jsonResponse({
          trips: [
            makeTrip({ id: "10", name: "Colorado Trail", status: "planning" }),
          ],
          total: 12,
          pageSize: 6,
        });
      }
      return jsonResponse({ trips: firstPage, total: 12, pageSize: 6 });
    }) as unknown as typeof fetch;

    renderComponent(firstPage, 12);
  });

  it("renders only the first-page preview trips before expanding", () => {
    expect(
      screen.getByRole("heading", { name: "John Muir Trail" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Long Trail" }),
    ).not.toBeInTheDocument();
  });

  it("renders the 'View all trips' button", () => {
    expect(
      screen.getByRole("button", { name: "View all trips" }),
    ).toBeInTheDocument();
  });

  it("reveals the rest of the first page after clicking 'View all trips'", async () => {
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Long Trail" }),
      ).toBeInTheDocument(),
    );
  });

  it("changes button text to 'View less' after clicking 'View all trips'", () => {
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    expect(
      screen.getByRole("button", { name: "View less" }),
    ).toBeInTheDocument();
  });

  it("collapses back after clicking 'View less'", async () => {
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Long Trail" }),
      ).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "View less" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("heading", { name: "Long Trail" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("renders pagination controls to browse additional pages", async () => {
    fireEvent.click(screen.getByRole("button", { name: "View all trips" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Long Trail" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
  });

  it("fetches the next page of trips when a pagination control is clicked", async () => {
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
