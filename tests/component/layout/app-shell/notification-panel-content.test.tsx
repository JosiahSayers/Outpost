import NotificationPanelContent from "$/frontend/layout/app-shell/notification-panel-content";
import { notificationKeys } from "$/frontend/utils/api/notifications";
import { DISMISS_ANIMATION_MS } from "$/frontend/utils/hooks/use-dismiss-animation";
import { UNREAD_NOTIFICATIONS_PARAMS } from "$/frontend/utils/hooks/use-unread-notification-count";
import type { ClientNotification } from "$/transformers/notification";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

const PANEL_PARAMS = { dismissed: false, take: 5 };
const COUNT_PARAMS = UNREAD_NOTIFICATIONS_PARAMS;

const onNavigate = mock(() => {});

function makeNotification(
  overrides: Partial<ClientNotification> = {},
): ClientNotification {
  return {
    id: "1",
    title: "Rae added 4 gear items to the shared list",
    description: null,
    icon: null,
    referenceUrl: "/trips/42",
    read: false,
    dismissed: false,
    createdAt: new Date(Date.now() - 12 * 60 * 1000),
    ...overrides,
  };
}

function renderPanel(
  notifications: ClientNotification[],
  unreadCount = notifications.filter((n) => !n.read).length,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(notificationKeys.list(PANEL_PARAMS), {
    notifications,
    total: notifications.length,
    pageSize: 5,
  });
  queryClient.setQueryData(notificationKeys.list(COUNT_PARAMS), {
    notifications: notifications.slice(0, 1),
    total: unreadCount,
    pageSize: 1,
  });

  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <Router hook={() => ["/dashboard", () => {}]}>
          <NotificationPanelContent onNavigate={onNavigate} />
        </Router>
      </MantineProvider>
    </QueryClientProvider>,
  );

  return queryClient;
}

function jsonResponse(body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

const originalFetch = global.fetch;
let fetchMock: ReturnType<
  typeof mock<(url: string, options?: RequestInit) => Promise<Response>>
>;

afterEach(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  onNavigate.mockReset();
  fetchMock = mock((_url: string, options?: RequestInit) => {
    if (options?.method === "PATCH") {
      return jsonResponse({ notification: makeNotification() });
    }
    return jsonResponse({ notifications: [], total: 0, pageSize: 5 });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

function findPatchCall() {
  return fetchMock.mock.calls.find(
    (call) => (call[1] as RequestInit | undefined)?.method === "PATCH",
  );
}

it("renders the header and unread count", () => {
  renderPanel([makeNotification()]);
  expect(screen.getByText("Notifications")).toBeInTheDocument();
  expect(screen.getByText("1 new")).toBeInTheDocument();
});

it("does not show an unread count when there are no unread notifications", () => {
  renderPanel([makeNotification({ read: true })], 0);
  expect(screen.queryByText(/new$/)).not.toBeInTheDocument();
});

it("renders a row for each notification", () => {
  renderPanel([
    makeNotification({ id: "1", title: "First notification" }),
    makeNotification({ id: "2", title: "Second notification" }),
  ]);
  expect(screen.getByText("First notification")).toBeInTheDocument();
  expect(screen.getByText("Second notification")).toBeInTheDocument();
});

it("shows an empty state when there are no notifications", () => {
  renderPanel([]);
  expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
});

it("renders a link out to the full notifications page", () => {
  renderPanel([]);
  expect(
    screen.getByRole("link", { name: /view all in notifications/i }),
  ).toHaveAttribute("href", "/notifications");
});

it("calls onNavigate when the 'view all' link is clicked", () => {
  renderPanel([]);
  fireEvent.click(
    screen.getByRole("link", { name: /view all in notifications/i }),
  );
  expect(onNavigate).toHaveBeenCalledTimes(1);
});

describe("clicking an unread row", () => {
  it("marks it read and calls onNavigate", async () => {
    renderPanel([makeNotification({ read: false })]);
    fireEvent.click(
      screen.getByText("Rae added 4 gear items to the shared list"),
    );

    expect(onNavigate).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      const patchCall = findPatchCall();
      expect(patchCall).toBeDefined();
      expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual(
        { read: true },
      );
    });
  });
});

describe("clicking an already-read row", () => {
  it("calls onNavigate without a PATCH request", () => {
    renderPanel([makeNotification({ read: true })], 0);
    fireEvent.click(
      screen.getByText("Rae added 4 gear items to the shared list"),
    );

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(findPatchCall()).toBeUndefined();
  });
});

describe("dismissing a row", () => {
  it("removes it from the list without calling onNavigate", async () => {
    renderPanel([makeNotification()]);
    const dismissButton = document.querySelector(
      '[aria-label="Dismiss notification"]',
    )!;
    fireEvent.click(dismissButton);

    // Beyond the real DISMISS_ANIMATION_MS timer, removal also depends on an
    // async mutation round trip (cancelQueries, the mocked PATCH fetch,
    // optimistic cache write, re-render) — testing-library's default 1000ms
    // waitFor budget is comfortable locally but has been observed to time
    // out on CI's slower/shared runners, so this gets a generous explicit
    // budget instead.
    await waitFor(
      () =>
        expect(
          screen.queryByText("Rae added 4 gear items to the shared list"),
        ).not.toBeInTheDocument(),
      { timeout: DISMISS_ANIMATION_MS + 4000 },
    );
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
