import PreferencesPanel from "$/frontend/account/preferences-panel";
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
    slug: "liquid_viewing_unit",
    name: "Preferred Liquid Viewing Unit",
    description: "Unit used to display liquid measurements.",
    defaultValue: "ml",
    value: "ml",
    ...overrides,
  };
}

const SETTINGS: ClientUserAccountSetting[] = [
  setting({
    slug: "liquid_viewing_unit",
    name: "Preferred Liquid Viewing Unit",
    value: "ml",
  }),
  setting({
    slug: "liquid_entry_unit",
    name: "Preferred Liquid Entry Unit",
    value: "liters",
  }),
  setting({
    slug: "weight_viewing_unit",
    name: "Preferred Weight Viewing Unit",
    value: "grams",
  }),
  setting({
    slug: "weight_entry_unit",
    name: "Preferred Weight Entry Unit",
    value: "kilograms",
  }),
];

function renderPanel(
  settings: ClientUserAccountSetting[] | undefined = SETTINGS,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  if (settings) {
    queryClient.setQueryData(accountSettingsKeys.all, settings);
  }
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <PreferencesPanel />
      </MantineProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

beforeEach(() => {
  global.fetch = mock(() =>
    Promise.resolve(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  ) as unknown as typeof fetch;
});

describe("while settings are loading", () => {
  it("shows a loader instead of the panel content", () => {
    renderPanel(undefined);
    expect(
      screen.queryByRole("heading", { name: "Units & Preferences" }),
    ).not.toBeInTheDocument();
  });
});

describe("once settings have loaded", () => {
  it("renders the section headings", () => {
    renderPanel();
    expect(
      screen.getByRole("heading", { level: 3, name: "Units & Preferences" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "Liquid Measurements" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 4, name: "Weight Measurements" }),
    ).toBeInTheDocument();
  });

  it("renders each select with its current value", () => {
    renderPanel();
    expect(
      screen.getByRole("combobox", { name: "Preferred Liquid Viewing Unit" }),
    ).toHaveValue("Milliliters (mL)");
    expect(
      screen.getByRole("combobox", { name: "Preferred Liquid Entry Unit" }),
    ).toHaveValue("Liters (L)");
    expect(
      screen.getByRole("combobox", { name: "Preferred Weight Viewing Unit" }),
    ).toHaveValue("Grams (g)");
    expect(
      screen.getByRole("combobox", { name: "Preferred Weight Entry Unit" }),
    ).toHaveValue("Kilograms (kg)");
  });

  it("falls back to the default unit when a setting has no value", () => {
    renderPanel(
      SETTINGS.map((s) =>
        s.slug === "liquid_viewing_unit" ? { ...s, value: null } : s,
      ),
    );
    expect(
      screen.getByRole("combobox", { name: "Preferred Liquid Viewing Unit" }),
    ).toHaveValue("Milliliters (mL)");
  });
});

describe("changing a fluid select", () => {
  it("optimistically updates the value and calls the API to persist it", async () => {
    renderPanel();
    const entryInput = screen.getByRole("combobox", {
      name: "Preferred Liquid Entry Unit",
    });

    fireEvent.click(entryInput);
    fireEvent.click(screen.getByRole("option", { name: "Cups (US)" }));

    expect(entryInput).toHaveValue("Cups (US)");

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/account/settings");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      settings: [{ slug: "liquid_entry_unit", value: "cupsUS" }],
    });
    await waitFor(() => {});
  });
});

describe("changing a weight select", () => {
  it("optimistically updates the value and calls the API to persist it", async () => {
    renderPanel();
    const viewingInput = screen.getByRole("combobox", {
      name: "Preferred Weight Viewing Unit",
    });

    fireEvent.click(viewingInput);
    fireEvent.click(screen.getByRole("option", { name: "Pounds (lb)" }));

    expect(viewingInput).toHaveValue("Pounds (lb)");

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const [url, init] = (global.fetch as unknown as ReturnType<typeof mock>)
      .mock.calls[0]! as [string, RequestInit];
    expect(url).toBe("/api/account/settings");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      settings: [{ slug: "weight_viewing_unit", value: "pounds" }],
    });
    await waitFor(() => {});
  });
});

describe("when the API call fails", () => {
  it("rolls back to the previous value", async () => {
    global.fetch = mock(() =>
      Promise.resolve(new Response("", { status: 500 })),
    ) as unknown as typeof fetch;
    renderPanel();
    const entryInput = screen.getByRole("combobox", {
      name: "Preferred Liquid Entry Unit",
    });

    fireEvent.click(entryInput);
    fireEvent.click(screen.getByRole("option", { name: "Cups (US)" }));

    expect(entryInput).toHaveValue("Cups (US)");

    await waitFor(() => expect(entryInput).toHaveValue("Liters (L)"));
  });
});
