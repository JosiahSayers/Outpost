import PushSubscriptionToggle from "$/frontend/account/notifications-panel/push-subscription-toggle";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const originalVapidKey = process.env.BUN_PUBLIC_VAPID_PUBLIC_KEY;

function renderToggle() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <PushSubscriptionToggle />
      </MantineProvider>
    </QueryClientProvider>,
  );
}

// happy-dom doesn't implement the Push API at all, so these globals are
// stubbed directly on navigator/window per test (not via mock.module(), see
// CLAUDE.md) rather than relying on anything the DOM environment provides.
function stubPushSupport({
  getSubscription,
  subscribe,
}: {
  getSubscription: ReturnType<typeof mock>;
  subscribe?: ReturnType<typeof mock>;
}) {
  Object.defineProperty(window, "PushManager", {
    value: class PushManager {},
    configurable: true,
  });
  Object.defineProperty(navigator, "serviceWorker", {
    value: {
      ready: Promise.resolve({
        pushManager: { getSubscription, subscribe },
      }),
    },
    configurable: true,
  });
}

beforeEach(() => {
  process.env.BUN_PUBLIC_VAPID_PUBLIC_KEY = "dGVzdC1rZXk"; // "test-key" base64url
  global.fetch = mock(() =>
    Promise.resolve(new Response("{}", { status: 201 })),
  ) as unknown as typeof fetch;
});

afterEach(() => {
  process.env.BUN_PUBLIC_VAPID_PUBLIC_KEY = originalVapidKey;
  // @ts-expect-error -- undoing the per-test stub
  delete window.PushManager;
  // @ts-expect-error -- undoing the per-test stub
  delete navigator.serviceWorker;
});

describe("when the browser doesn't support push", () => {
  it("renders nothing", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider>
          <PushSubscriptionToggle />
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(screen.queryByRole("switch")).not.toBeInTheDocument(),
    );
  });
});

describe("when the browser supports push", () => {
  it("shows the switch unchecked when there is no existing subscription", async () => {
    stubPushSupport({ getSubscription: mock(() => Promise.resolve(null)) });

    renderToggle();

    await waitFor(() => expect(screen.getByRole("switch")).not.toBeChecked());
  });

  it("shows the switch checked when a subscription already exists", async () => {
    stubPushSupport({
      getSubscription: mock(() =>
        Promise.resolve({ endpoint: "https://push.example.com/existing" }),
      ),
    });

    renderToggle();

    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());
  });

  it("subscribes and posts to the API when turned on and permission is granted", async () => {
    const subscribeMock = mock(() =>
      Promise.resolve({
        endpoint: "https://push.example.com/new",
        toJSON: () => ({
          endpoint: "https://push.example.com/new",
          keys: { p256dh: "p", auth: "a" },
        }),
      }),
    );
    stubPushSupport({
      getSubscription: mock(() => Promise.resolve(null)),
      subscribe: subscribeMock,
    });
    (global as any).Notification = {
      requestPermission: mock(() => Promise.resolve("granted")),
    };

    renderToggle();
    await waitFor(() => expect(screen.getByRole("switch")).not.toBeChecked());

    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/push-subscriptions");
    expect(init.method).toBe("POST");
    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());
  });

  it("shows a blocked state when permission is denied", async () => {
    stubPushSupport({ getSubscription: mock(() => Promise.resolve(null)) });
    (global as any).Notification = {
      requestPermission: mock(() => Promise.resolve("denied")),
    };

    renderToggle();
    await waitFor(() => expect(screen.getByRole("switch")).not.toBeChecked());

    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() =>
      expect(
        screen.getByText(/blocked in your browser settings/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("unsubscribes and calls DELETE when turned off", async () => {
    const unsubscribeMock = mock(() => Promise.resolve(true));
    stubPushSupport({
      getSubscription: mock(() =>
        Promise.resolve({
          endpoint: "https://push.example.com/existing",
          unsubscribe: unsubscribeMock,
        }),
      ),
    });

    renderToggle();
    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());

    fireEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/push-subscriptions");
    expect(init.method).toBe("DELETE");
    expect(JSON.parse(init.body as string)).toEqual({
      endpoint: "https://push.example.com/existing",
    });
    await waitFor(() => expect(unsubscribeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("switch")).not.toBeChecked());
  });
});
