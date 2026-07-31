import { notificationKeys } from "$/frontend/utils/api/notifications";
import { useNotificationArrivalAlert } from "$/frontend/utils/hooks/use-notification-arrival-alert";
import type { ClientNotification } from "$/transformers/notification";
import { MantineProvider } from "@mantine/core";
import type { NotificationData } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Router } from "wouter";

const RECENT_PARAMS = { read: false, dismissed: false, take: 10 };

const showToast = mock((_notification: NotificationData) => "");
const navigate = mock((_to: string) => {});

// Invalidating notificationKeys.all (so the panel/page pick up the arrival
// too, see use-notification-arrival-alert.tsx) refetches this hook's own
// active query, and clicking a toast marks it read via a PATCH — stub fetch
// so both hit a mock instead of a real network call.
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

function findPatchCall() {
  return fetchMock.mock.calls.find(
    (call) => (call[1] as RequestInit | undefined)?.method === "PATCH",
  );
}

let nextId = 0;
function makeNotification(
  overrides: Partial<ClientNotification> = {},
): ClientNotification {
  nextId += 1;
  return {
    id: String(nextId),
    title: "Trip starts in 3 days",
    description: null,
    icon: null,
    referenceUrl: null,
    read: false,
    dismissed: false,
    createdAt: new Date(),
    ...overrides,
  };
}

function resultOf(notifications: ClientNotification[]) {
  return { notifications, total: notifications.length, pageSize: 10 };
}

function Display({ enabled }: { enabled: boolean }) {
  const { pulsing } = useNotificationArrivalAlert(enabled, showToast);
  return <div data-testid="state">{pulsing ? "pulsing" : "idle"}</div>;
}

function renderDisplay(initial: ClientNotification[], enabled = true) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(
    notificationKeys.list(RECENT_PARAMS),
    resultOf(initial),
  );

  render(
    <QueryClientProvider client={queryClient}>
      <Router hook={() => ["/dashboard", navigate]}>
        <Display enabled={enabled} />
      </Router>
    </QueryClientProvider>,
  );

  return queryClient;
}

// The toast body is a ReactNode (shared NotificationContent), not a plain
// string, so render a given call's `message` to assert on its text.
function renderToastMessage(callIndex: number) {
  const call = showToast.mock.calls[callIndex]?.[0];
  return render(<MantineProvider>{call?.message}</MantineProvider>);
}

beforeEach(() => {
  showToast.mockReset();
  navigate.mockReset();
  fetchMock = mock((_url: string, options?: RequestInit) => {
    if (options?.method === "PATCH") {
      return jsonResponse({ notification: makeNotification() });
    }
    return jsonResponse({ notifications: [], total: 0, pageSize: 10 });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
});

it("does not pulse or toast on the initial load", () => {
  renderDisplay([makeNotification()]);
  expect(screen.getByTestId("state")).toHaveTextContent("idle");
  expect(showToast).not.toHaveBeenCalled();
});

describe("when a newer notification arrives", () => {
  it("pulses and shows a toast with its title", async () => {
    const queryClient = renderDisplay([]);

    queryClient.setQueryData(
      notificationKeys.list(RECENT_PARAMS),
      resultOf([makeNotification({ title: "Rae added 4 gear items" })]),
    );

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("pulsing"),
    );
    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast.mock.calls[0]?.[0]?.color).toBe("trail-green");

    const { getByText } = renderToastMessage(0);
    expect(getByText("Rae added 4 gear items")).toBeInTheDocument();
  });

  it("stops pulsing again after a moment", async () => {
    const queryClient = renderDisplay([]);
    queryClient.setQueryData(
      notificationKeys.list(RECENT_PARAMS),
      resultOf([makeNotification()]),
    );

    await waitFor(() =>
      expect(screen.getByTestId("state")).toHaveTextContent("pulsing"),
    );
    await waitFor(
      () => expect(screen.getByTestId("state")).toHaveTextContent("idle"),
      { timeout: 2000 },
    );
  });
});

describe("clicking the toast", () => {
  it("marks it read and navigates when there's a referenceUrl", async () => {
    const queryClient = renderDisplay([]);
    queryClient.setQueryData(
      notificationKeys.list(RECENT_PARAMS),
      resultOf([
        makeNotification({
          title: "Rae added 4 gear items",
          referenceUrl: "/trips/42",
        }),
      ]),
    );

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    const { getByText } = renderToastMessage(0);
    fireEvent.click(getByText("Rae added 4 gear items"));

    expect(navigate.mock.calls[0]?.[0]).toBe("/trips/42");
    await waitFor(() => {
      const patchCall = findPatchCall();
      expect(patchCall).toBeDefined();
      expect(JSON.parse((patchCall![1] as RequestInit).body as string)).toEqual(
        { read: true },
      );
    });
  });

  it("marks it read without navigating when there's no referenceUrl", async () => {
    const queryClient = renderDisplay([]);
    queryClient.setQueryData(
      notificationKeys.list(RECENT_PARAMS),
      resultOf([
        makeNotification({
          title: "Rae added 4 gear items",
          referenceUrl: null,
        }),
      ]),
    );

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(1));
    const { getByText } = renderToastMessage(0);
    fireEvent.click(getByText("Rae added 4 gear items"));

    expect(navigate).not.toHaveBeenCalled();
    await waitFor(() => expect(findPatchCall()).toBeDefined());
  });
});

describe("when a newer notification arrives while the panel is closed", () => {
  it("invalidates other cached notification queries (e.g. the panel's) so they refetch on next open", async () => {
    const PANEL_PARAMS = { dismissed: false, take: 5 };
    const queryClient = renderDisplay([]);
    // Simulate the panel having already been opened once and cached an
    // (now stale) empty list — this is the exact state that showed "You're
    // all caught up" despite the unread badge going to 1.
    queryClient.setQueryData(notificationKeys.list(PANEL_PARAMS), resultOf([]));

    queryClient.setQueryData(
      notificationKeys.list(RECENT_PARAMS),
      resultOf([makeNotification()]),
    );

    await waitFor(() =>
      expect(
        queryClient.getQueryState(notificationKeys.list(PANEL_PARAMS))
          ?.isInvalidated,
      ).toBe(true),
    );
  });
});

describe("when several newer notifications arrive in one batch", () => {
  it("shows one toast per new notification, oldest first", async () => {
    const original = makeNotification({
      title: "Original",
      createdAt: new Date(Date.now() - 10_000),
    });
    const queryClient = renderDisplay([original]);

    const second = makeNotification({
      title: "Second arrival",
      createdAt: new Date(Date.now() - 5_000),
    });
    const third = makeNotification({
      title: "Third arrival",
      createdAt: new Date(),
    });
    queryClient.setQueryData(
      notificationKeys.list(RECENT_PARAMS),
      resultOf([third, second, original]),
    );

    await waitFor(() => expect(showToast).toHaveBeenCalledTimes(2));
    const first = renderToastMessage(0);
    const secondToast = renderToastMessage(1);
    expect(
      within(first.container).getByText("Second arrival"),
    ).toBeInTheDocument();
    expect(
      within(secondToast.container).getByText("Third arrival"),
    ).toBeInTheDocument();
  });
});

describe("when the list changes but nothing is newer", () => {
  it("does not pulse or toast", async () => {
    const notification = makeNotification();
    const queryClient = renderDisplay([notification, makeNotification()]);
    queryClient.setQueryData(
      notificationKeys.list(RECENT_PARAMS),
      resultOf([notification]),
    );

    // Give any (incorrect) effect a moment to fire before asserting it
    // didn't. Wrapped in act since the query cache's own notify (even for
    // this deliberate setQueryData above) is delivered via a macrotask, not
    // synchronously.
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.getByTestId("state")).toHaveTextContent("idle");
    expect(showToast).not.toHaveBeenCalled();
  });
});

describe("when disabled", () => {
  it("never fetches, pulses, or toasts", async () => {
    renderDisplay([], false);
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));
    expect(screen.getByTestId("state")).toHaveTextContent("idle");
    expect(showToast).not.toHaveBeenCalled();
  });
});
