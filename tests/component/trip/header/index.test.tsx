import Header from "$/frontend/trip/header";
import type { ClientTrip } from "$/transformers/trip";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

function trip(overrides: Partial<ClientTrip> = {}): ClientTrip {
  return {
    id: "trip-1",
    name: "Wonderland Trail Loop",
    trail: "Wonderland Trail",
    location: "Mount Rainier National Park",
    status: "planning",
    start: "2026-08-14",
    end: "2026-08-19",
    ...overrides,
  };
}

const navigate = mock((_path: string, _opts?: unknown) => {});

function renderHeader(t: ClientTrip = trip()) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <Router hook={() => ["/trips/trip-1", navigate as any]}>
          <Header trip={t} />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  navigate.mockReset();
  global.fetch = mock(() =>
    Promise.resolve(new Response(null, { status: 200 })),
  ) as unknown as typeof fetch;
});

describe("deleting the trip", () => {
  it("opens a confirmation modal naming the trip", async () => {
    renderHeader(trip({ name: "Wonderland Trail Loop" }));
    fireEvent.click(screen.getByRole("button", { name: "Trip actions" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Delete trip" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Delete trip?" }),
      ).toBeInTheDocument(),
    );
    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent ===
          "Remove Wonderland Trail Loop? This can't be undone.",
      ),
    ).toBeInTheDocument();
  });

  it("calls the delete API and navigates to the dashboard on confirm", async () => {
    renderHeader(trip({ id: "trip-99" }));
    fireEvent.click(screen.getByRole("button", { name: "Trip actions" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Delete trip" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/trips/trip-99");
    expect(init.method).toBe("DELETE");
    await waitFor(() => expect(navigate.mock.calls[0]?.[0]).toBe("/dashboard"));
  });

  it("does not call the delete API when cancelled", async () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: "Trip actions" }));
    fireEvent.click(
      await screen.findByRole("menuitem", { name: "Delete trip" }),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
