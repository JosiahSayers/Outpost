import {
  AccountSettingsProviderBase,
  useAccountSettingsContext,
} from "$/frontend/account/account-settings-context";
import { accountSettingsKeys } from "$/frontend/utils/api/account-settings";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const SETTINGS: ClientUserAccountSetting[] = [
  {
    slug: "weight_viewing_unit",
    name: "Preferred Weight Viewing Unit",
    description: "Unit used to display weight measurements.",
    defaultValue: null,
    value: "pounds",
  },
];

function ContextReader() {
  const { settings, isPending } = useAccountSettingsContext();
  return (
    <div data-testid="settings">
      {isPending
        ? "pending"
        : settings === undefined
          ? "undefined"
          : JSON.stringify(settings)}
    </div>
  );
}

function renderProvider(isAuthenticated: boolean, seedSettings?: boolean) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (seedSettings) {
    queryClient.setQueryData(accountSettingsKeys.all, SETTINGS);
  }
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AccountSettingsProviderBase isAuthenticated={isAuthenticated}>
          <ContextReader />
        </AccountSettingsProviderBase>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({ settings: SETTINGS }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("when authenticated and settings have not loaded yet", () => {
  it("renders children immediately, reporting isPending instead of blocking", () => {
    renderProvider(true);
    expect(screen.getByTestId("settings")).toHaveTextContent("pending");
  });

  it("updates once the fetch resolves", async () => {
    renderProvider(true);
    await waitFor(() =>
      expect(screen.getByTestId("settings")).toHaveTextContent("pounds"),
    );
  });
});

describe("when authenticated and settings are already cached", () => {
  it("renders children immediately with the settings in context, not pending", () => {
    renderProvider(true, true);
    expect(screen.getByTestId("settings")).toHaveTextContent("pounds");
  });
});

describe("when not authenticated", () => {
  it("renders children immediately without fetching, exposing undefined settings and not pending", () => {
    renderProvider(false);
    expect(screen.getByTestId("settings")).toHaveTextContent("undefined");
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
