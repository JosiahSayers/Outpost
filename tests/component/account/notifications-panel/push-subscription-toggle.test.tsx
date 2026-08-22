import { AccountSettingsProviderBase } from "$/frontend/account/account-settings-context";
import PushSubscriptionToggle from "$/frontend/account/notifications-panel/push-subscription-toggle";
import { accountSettingsKeys } from "$/frontend/utils/api/account-settings";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const originalVapidKey = process.env.BUN_PUBLIC_VAPID_PUBLIC_KEY;
const defaultUserAgent = navigator.userAgent;

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

function stubUserAgent(ua: string) {
  Object.defineProperty(navigator, "userAgent", {
    value: ua,
    configurable: true,
  });
}

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

function setting(
  overrides: Partial<ClientUserAccountSetting> = {},
): ClientUserAccountSetting {
  return {
    slug: "notification_trip_status_update_in_app",
    name: "Trip Status Updates - In-App",
    description: "Test notification",
    defaultValue: "true",
    value: "true",
    ...overrides,
  };
}

// Same wrapping convention as notifications-panel/index.test.tsx: pre-seed
// the settings query so useAccountSettingsContext resolves synchronously,
// no separate GET mock needed.
function renderToggleWithSettings(settings: ClientUserAccountSetting[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(accountSettingsKeys.all, settings);
  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AccountSettingsProviderBase isAuthenticated>
          <PushSubscriptionToggle />
        </AccountSettingsProviderBase>
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
  stubUserAgent(defaultUserAgent);
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

    // The mount effect's /check call also hits fetch, so find the DELETE
    // call rather than assuming it's the first one.
    await waitFor(() =>
      expect(
        (global.fetch as unknown as ReturnType<typeof mock>).mock.calls.some(
          ([, init]) => (init as RequestInit)?.method === "DELETE",
        ),
      ).toBe(true),
    );
    const [url, init] = (
      global.fetch as unknown as ReturnType<typeof mock>
    ).mock.calls.find(
      ([, init]) => (init as RequestInit)?.method === "DELETE",
    )! as [string, RequestInit];
    expect(url).toBe("/api/push-subscriptions");
    expect(JSON.parse(init.body as string)).toEqual({
      endpoint: "https://push.example.com/existing",
    });
    await waitFor(() => expect(unsubscribeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("switch")).not.toBeChecked());
  });
});

describe("on iOS Safari before it's been added to the Home Screen", () => {
  it("shows an install message instead of the switch, even though the browser otherwise supports push", () => {
    stubUserAgent(IPHONE_UA);
    stubPushSupport({ getSubscription: mock(() => Promise.resolve(null)) });

    renderToggle();

    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(
      screen.getByText(/install to your home screen to turn this on/i),
    ).toBeInTheDocument();
  });
});

describe("enabling default push settings", () => {
  // The cascade mutation invalidates the settings query on settle, so a
  // realistic GET response is needed here too -- otherwise the background
  // refetch resolves to undefined and React Query logs a spurious warning.
  function mockFetch({
    checkStatus,
    settings,
  }: {
    checkStatus?: number;
    settings: ClientUserAccountSetting[];
  }) {
    return mock((url: string, init?: RequestInit) => {
      if (url === "/api/push-subscriptions/check") {
        return Promise.resolve(new Response("{}", { status: checkStatus }));
      }
      if (url === "/api/account/settings" && !init) {
        return Promise.resolve(
          new Response(JSON.stringify({ settings }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        );
      }
      return Promise.resolve(new Response("{}", { status: 201 }));
    }) as unknown as typeof fetch;
  }

  function findPatchCall(fetchMock: ReturnType<typeof mock>) {
    return fetchMock.mock.calls.find((call: any[]) => {
      const [, init] = call as [string, RequestInit];
      return init?.method === "PATCH";
    }) as [string, RequestInit] | undefined;
  }

  it("turns on push for notifications already enabled via in-app or email, but not ones fully off", async () => {
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
    const settings = [
      setting({
        slug: "notification_trip_status_update_in_app",
        value: "true",
      }),
      setting({
        slug: "notification_trip_status_update_email",
        value: "false",
      }),
      setting({
        slug: "notification_trip_status_update_web_push",
        value: "false",
      }),
      setting({
        slug: "notification_meal_plan_unpurchased_items_in_app",
        value: "false",
      }),
      setting({
        slug: "notification_meal_plan_unpurchased_items_email",
        value: "false",
      }),
      setting({
        slug: "notification_meal_plan_unpurchased_items_web_push",
        value: "false",
      }),
    ];
    global.fetch = mockFetch({ settings });

    renderToggleWithSettings(settings);

    await waitFor(() => expect(screen.getByRole("switch")).not.toBeChecked());
    fireEvent.click(screen.getByRole("switch"));
    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());

    await waitFor(() =>
      expect(
        findPatchCall(global.fetch as unknown as ReturnType<typeof mock>),
      ).toBeDefined(),
    );
    const [url, init] = findPatchCall(
      global.fetch as unknown as ReturnType<typeof mock>,
    )!;
    expect(url).toBe("/api/account/settings");
    expect(JSON.parse(init.body as string)).toEqual({
      settings: [
        { slug: "notification_trip_status_update_web_push", value: "true" },
      ],
    });
  });

  it("does not run the cascade during the mount-time auto-heal resubscribe", async () => {
    const unsubscribeMock = mock(() => Promise.resolve(true));
    const subscribeMock = mock(() =>
      Promise.resolve({
        endpoint: "https://push.example.com/fresh",
        toJSON: () => ({
          endpoint: "https://push.example.com/fresh",
          keys: { p256dh: "p", auth: "a" },
        }),
      }),
    );
    stubPushSupport({
      getSubscription: mock(() =>
        Promise.resolve({
          endpoint: "https://push.example.com/stale",
          unsubscribe: unsubscribeMock,
        }),
      ),
      subscribe: subscribeMock,
    });
    (global as any).Notification = {
      requestPermission: mock(() => Promise.resolve("granted")),
    };
    const settings = [
      setting({
        slug: "notification_trip_status_update_in_app",
        value: "true",
      }),
      setting({
        slug: "notification_trip_status_update_web_push",
        value: "false",
      }),
    ];
    global.fetch = mockFetch({ checkStatus: 404, settings });

    renderToggleWithSettings(settings);

    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());

    expect(
      findPatchCall(global.fetch as unknown as ReturnType<typeof mock>),
    ).toBeUndefined();
  });
});

describe("mount-time auto-heal (server pruned a still-present client subscription)", () => {
  function mockFetchWithCheckResult(checkStatus: number) {
    return mock((url: string) => {
      if (url === "/api/push-subscriptions/check") {
        return Promise.resolve(new Response("{}", { status: checkStatus }));
      }
      return Promise.resolve(new Response("{}", { status: 201 }));
    });
  }

  it("silently resubscribes when /check 404s and the resubscribe succeeds", async () => {
    const unsubscribeMock = mock(() => Promise.resolve(true));
    const subscribeMock = mock(() =>
      Promise.resolve({
        endpoint: "https://push.example.com/fresh",
        toJSON: () => ({
          endpoint: "https://push.example.com/fresh",
          keys: { p256dh: "p", auth: "a" },
        }),
      }),
    );
    stubPushSupport({
      getSubscription: mock(() =>
        Promise.resolve({
          endpoint: "https://push.example.com/stale",
          unsubscribe: unsubscribeMock,
        }),
      ),
      subscribe: subscribeMock,
    });
    (global as any).Notification = {
      requestPermission: mock(() => Promise.resolve("granted")),
    };
    global.fetch = mockFetchWithCheckResult(404) as unknown as typeof fetch;

    renderToggle();

    await waitFor(() => expect(unsubscribeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(subscribeMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());
    const postCall = (
      global.fetch as unknown as ReturnType<typeof mock>
    ).mock.calls.find((call: any[]) => {
      const [url, init] = call as [string, RequestInit];
      return url === "/api/push-subscriptions" && init.method === "POST";
    });
    expect(postCall).toBeDefined();
  });

  it("does nothing when /check confirms the subscription still exists", async () => {
    const subscribeMock = mock(() => Promise.resolve({}));
    stubPushSupport({
      getSubscription: mock(() =>
        Promise.resolve({ endpoint: "https://push.example.com/still-good" }),
      ),
      subscribe: subscribeMock,
    });
    global.fetch = mockFetchWithCheckResult(200) as unknown as typeof fetch;

    renderToggle();

    await waitFor(() => expect(screen.getByRole("switch")).toBeChecked());
    expect(subscribeMock).not.toHaveBeenCalled();
  });

  it("falls back to unsubscribed when /check 404s and resubscribe fails", async () => {
    const unsubscribeMock = mock(() => Promise.resolve(true));
    const subscribeMock = mock(() =>
      Promise.reject(new Error("permission revoked")),
    );
    stubPushSupport({
      getSubscription: mock(() =>
        Promise.resolve({
          endpoint: "https://push.example.com/stale",
          unsubscribe: unsubscribeMock,
        }),
      ),
      subscribe: subscribeMock,
    });
    (global as any).Notification = {
      requestPermission: mock(() => Promise.resolve("granted")),
    };
    global.fetch = mockFetchWithCheckResult(404) as unknown as typeof fetch;

    renderToggle();

    await waitFor(() => expect(screen.getByRole("switch")).not.toBeChecked());
    expect(screen.getByRole("switch")).not.toBeDisabled();
  });
});
