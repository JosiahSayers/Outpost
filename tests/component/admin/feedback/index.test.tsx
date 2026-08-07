import FeedbackList from "$/frontend/admin/feedback";
import { adminFeedbackKeys } from "$/frontend/utils/api/admin-feedback";
import type { ClientAdminFeedbackListItem } from "$/transformers/admin/feedback";
import type { ClientAdminUser } from "$/transformers/admin/user";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

const ACTIONABLE_STATUSES = ["new", "triaged", "planned", "in_progress"] as [
  "new",
  "triaged",
  "planned",
  "in_progress",
];

function makeUser(overrides: Partial<ClientAdminUser> = {}): ClientAdminUser {
  return {
    id: "user-1",
    banExpires: null,
    banReason: null,
    banned: false,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    email: "priya@fernridge.co",
    emailVerified: true,
    image: null,
    name: "Priya Natarajan",
    role: "user",
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeFeedbackListItem(
  overrides: Partial<ClientAdminFeedbackListItem> = {},
): ClientAdminFeedbackListItem {
  return {
    id: "feedback-1",
    referenceId: "A1B2C3",
    createdAt: new Date("2026-08-01T18:42:00Z"),
    duplicateId: null,
    inferredSubject: ["trip-duplication"],
    inferredTopic: ["packing-list"],
    status: "new",
    submittedOnPage: "/trips/big-sur-2026/packing-list",
    text: "Packing list quantities reset to zero every time I duplicate a trip.",
    user: makeUser(),
    ...overrides,
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
}

function renderList(
  queryClient: QueryClient = makeQueryClient(),
  navigate: (to: string) => void = () => {},
) {
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/console/feedback", navigate]}>
          <FeedbackList />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe("on initial load", () => {
  it("defaults to the actionable statuses and shows the results", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      adminFeedbackKeys.list(ACTIONABLE_STATUSES, 0, 10),
      { feedback: [makeFeedbackListItem()], total: 1, pageSize: 10 },
    );
    renderList(queryClient);

    await waitFor(() => screen.getByText(/Packing list quantities reset/));
    expect(screen.getByText("Priya Natarajan")).toBeInTheDocument();
    expect(screen.getByText("priya@fernridge.co")).toBeInTheDocument();
    expect(
      screen.getByText("/trips/big-sur-2026/packing-list"),
    ).toBeInTheDocument();
    // "New" also appears as a filter chip label, so scope to the table.
    expect(
      within(screen.getByRole("table")).getByText("New"),
    ).toBeInTheDocument();
  });
});

describe("when there is no matching feedback", () => {
  it("shows an empty state", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      adminFeedbackKeys.list(ACTIONABLE_STATUSES, 0, 10),
      { feedback: [], total: 0, pageSize: 10 },
    );
    renderList(queryClient);

    await waitFor(() =>
      expect(
        screen.getByText("No feedback matches these statuses"),
      ).toBeInTheDocument(),
    );
  });
});

describe("when the request fails", () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("shows an error state", async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response(null, { status: 500 })),
    ) as unknown as typeof fetch;

    renderList();

    await waitFor(() =>
      expect(screen.getByText("Couldn’t load feedback.")).toBeInTheDocument(),
    );
  });
});

describe("toggling the status filter", () => {
  it("includes newly-checked statuses in the request", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      adminFeedbackKeys.list(ACTIONABLE_STATUSES, 0, 10),
      { feedback: [makeFeedbackListItem()], total: 1, pageSize: 10 },
    );
    queryClient.setQueryData(
      adminFeedbackKeys.list([...ACTIONABLE_STATUSES, "completed"], 0, 10),
      {
        feedback: [
          makeFeedbackListItem({
            id: "feedback-2",
            status: "completed",
            text: "Export to PDF cuts off the last column.",
          }),
        ],
        total: 1,
        pageSize: 10,
      },
    );
    renderList(queryClient);
    await waitFor(() => screen.getByText(/Packing list quantities reset/));

    fireEvent.click(screen.getByRole("checkbox", { name: "Completed" }));

    await waitFor(() =>
      expect(
        screen.getByText("Export to PDF cuts off the last column."),
      ).toBeInTheDocument(),
    );
  });
});

describe("paginating through feedback", () => {
  it("requests the next page when a page control is clicked", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      adminFeedbackKeys.list(ACTIONABLE_STATUSES, 0, 10),
      {
        feedback: [makeFeedbackListItem({ id: "feedback-1" })],
        total: 15,
        pageSize: 10,
      },
    );
    queryClient.setQueryData(
      adminFeedbackKeys.list(ACTIONABLE_STATUSES, 10, 10),
      {
        feedback: [
          makeFeedbackListItem({
            id: "feedback-2",
            text: "Dark mode trip-status pill is unreadable.",
          }),
        ],
        total: 15,
        pageSize: 10,
      },
    );
    renderList(queryClient);
    await waitFor(() => screen.getByText(/Packing list quantities reset/));

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    await waitFor(() =>
      expect(
        screen.getByText("Dark mode trip-status pill is unreadable."),
      ).toBeInTheDocument(),
    );
  });
});

describe("clicking a row", () => {
  it("navigates to that feedback item's detail page", async () => {
    const queryClient = makeQueryClient();
    queryClient.setQueryData(
      adminFeedbackKeys.list(ACTIONABLE_STATUSES, 0, 10),
      {
        feedback: [makeFeedbackListItem({ id: "feedback-42" })],
        total: 1,
        pageSize: 10,
      },
    );
    const navigate = mock((_to: string) => {});
    renderList(queryClient, navigate);
    await waitFor(() => screen.getByText(/Packing list quantities reset/));

    fireEvent.click(screen.getByText(/Packing list quantities reset/));

    // The first call is the mount-time URL sync (see the useEffect in
    // FeedbackList); the row click is the most recent call.
    expect(navigate.mock.calls.at(-1)?.[0]).toBe(
      "/console/feedback/feedback-42",
    );
  });
});
