import { AccountSettingsProviderBase } from "$/frontend/account/account-settings-context";
import NotificationsPanel from "$/frontend/account/notifications-panel";
import { accountSettingsKeys } from "$/frontend/utils/api/account-settings";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

function setting(
  overrides: Partial<ClientUserAccountSetting> = {},
): ClientUserAccountSetting {
  return {
    slug: "notification_trip_status_update_in_app",
    name: "Trip Status Updates - In-App",
    description:
      "Outpost automatically marks your trip as In Progress or Completed based on your start and end dates.",
    defaultValue: "true",
    value: "true",
    ...overrides,
  };
}

const SETTINGS: ClientUserAccountSetting[] = [
  setting({
    slug: "notification_trip_status_update_in_app",
    value: "true",
  }),
  setting({
    slug: "notification_trip_status_update_email",
    value: "false",
  }),
];

function renderPanel(settings: ClientUserAccountSetting[] | undefined) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  if (settings) {
    queryClient.setQueryData(accountSettingsKeys.all, settings);
  }
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AccountSettingsProviderBase isAuthenticated>
          <NotificationsPanel />
        </AccountSettingsProviderBase>
      </MantineProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

// Same stateful fetch mock pattern as preferences-panel/index.test.tsx: PATCH
// applies to an in-memory copy, GET returns it, so the invalidateQueries
// refetch after a successful mutation doesn't clobber the just-applied value.
let currentSettings: ClientUserAccountSetting[];

beforeEach(() => {
  currentSettings = SETTINGS.map((s) => ({ ...s }));
  global.fetch = mock((_url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") {
      const { settings } = JSON.parse(init.body as string) as {
        settings: { slug: string; value: string }[];
      };
      for (const patch of settings) {
        const target = currentSettings.find((s) => s.slug === patch.slug);
        if (target) target.value = patch.value;
      }
      return Promise.resolve(
        new Response("{}", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ settings: currentSettings }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }) as unknown as typeof fetch;
});

describe("while settings are loading", () => {
  it("shows a loader instead of the panel content", () => {
    renderPanel(undefined);
    expect(
      screen.queryByRole("heading", { name: "Notifications" }),
    ).not.toBeInTheDocument();
  });
});

describe("once settings have loaded", () => {
  it("renders the trip status update card with each channel's current value", async () => {
    renderPanel(SETTINGS);
    expect(
      screen.getByRole("heading", { level: 4, name: "Trip Status Updates" }),
    ).toBeInTheDocument();
    const switches = screen.getAllByRole("switch");
    expect(switches[0]).toBeChecked();
    expect(switches[1]).not.toBeChecked();
    await waitFor(() => {});
  });

  it("renders the description from the in-app setting's account setting data", async () => {
    renderPanel(SETTINGS);
    expect(screen.getByText(SETTINGS[0]!.description!)).toBeInTheDocument();
    await waitFor(() => {});
  });

  it("falls back to the email setting's description when only it has loaded", async () => {
    renderPanel([
      setting({
        slug: "notification_trip_status_update_email",
        name: "Trip Status Updates - Email",
        description: "Email-only description",
      }),
    ]);
    expect(screen.getByText("Email-only description")).toBeInTheDocument();
    await waitFor(() => {});
  });

  it("renders no cards when there are no notification settings", () => {
    renderPanel([]);
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
  });

  it("renders a separate card for each distinct notification type present in the settings", async () => {
    renderPanel([
      ...SETTINGS,
      setting({
        slug: "notification_shared_gear_list_changes_in_app",
        name: "Shared Gear List Changes - In-App",
        description: "Get notified when a shared gear list changes.",
        value: "true",
      }),
      setting({
        slug: "notification_shared_gear_list_changes_email",
        name: "Shared Gear List Changes - Email",
        description: "Get notified when a shared gear list changes.",
        value: "false",
      }),
    ]);

    expect(
      screen.getByRole("heading", { level: 4, name: "Trip Status Updates" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 4,
        name: "Shared Gear List Changes",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("switch")).toHaveLength(4);
    await waitFor(() => {});
  });
});

describe("toggling the in-app switch", () => {
  it("optimistically updates the value and calls the API to persist it", async () => {
    renderPanel(SETTINGS);
    const [inAppSwitch] = screen.getAllByRole("switch");

    fireEvent.click(inAppSwitch!);

    await waitFor(() =>
      expect(inAppSwitch).toHaveAttribute("data-checked", "false"),
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/account/settings");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      settings: [
        { slug: "notification_trip_status_update_in_app", value: "false" },
      ],
    });
    await waitFor(() => {});
  });
});

describe("toggling the email switch", () => {
  it("optimistically updates the value and calls the API to persist it", async () => {
    renderPanel(SETTINGS);
    const [, emailSwitch] = screen.getAllByRole("switch");

    fireEvent.click(emailSwitch!);

    await waitFor(() =>
      expect(emailSwitch).toHaveAttribute("data-checked", "true"),
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/account/settings");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      settings: [
        { slug: "notification_trip_status_update_email", value: "true" },
      ],
    });
    await waitFor(() => {});
  });
});

describe("when the API call fails", () => {
  it("rolls back to the previous value", async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response("", { status: 500 })),
    ) as unknown as typeof fetch;
    renderPanel(SETTINGS);
    const [inAppSwitch] = screen.getAllByRole("switch");

    fireEvent.click(inAppSwitch!);

    await waitFor(() =>
      expect(inAppSwitch).toHaveAttribute("data-checked", "true"),
    );
  });
});
