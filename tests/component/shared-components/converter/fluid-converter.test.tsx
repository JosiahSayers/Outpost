import { AccountSettingsProviderBase } from "$/frontend/account/account-settings-context";
import FluidConverter from "$/frontend/shared-components/converter/fluid-converter";
import { accountSettingsKeys } from "$/frontend/utils/api/account-settings";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";

const onChange = mock(() => {});

function renderConverter(
  value: number | string,
  overrides: Record<string, unknown> = {},
) {
  render(
    <MantineProvider>
      <FluidConverter
        label="Water"
        value={value}
        onChange={onChange}
        {...overrides}
      />
    </MantineProvider>,
  );
}

function renderConverterWithSetting(
  value: number | string,
  setting: ClientUserAccountSetting,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(accountSettingsKeys.all, [setting]);
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AccountSettingsProviderBase isAuthenticated>
          <FluidConverter label="Water" value={value} onChange={onChange} />
        </AccountSettingsProviderBase>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  onChange.mockReset();
});

describe("default unit detection", () => {
  it("defaults to Cups (US) in the en-US test environment", async () => {
    renderConverter(237);
    expect(screen.getByRole("combobox")).toHaveValue("Cups (US)");
    await waitFor(() => {});
  });

  it("uses the stored liquid_entry_unit account setting instead of the locale default", async () => {
    renderConverterWithSetting(2000, {
      slug: "liquid_entry_unit",
      name: "Preferred Liquid Entry Unit",
      description: "Unit used when entering liquid measurements.",
      defaultValue: null,
      value: "liters",
    });
    expect(screen.getByRole("combobox")).toHaveValue("Liters (L)");
    await waitFor(() => {});
  });
});

describe("default decimal display", () => {
  it("rounds to 2 decimals, collapsing float noise instead of showing trailing zeros", async () => {
    // 1 cup rounded to the nearest ml (237) converts back to ~1.0017 cups.
    renderConverter(237);
    expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue("1");
    await waitFor(() => {});
  });
});

describe("typing a number", () => {
  it("calls onChange with the value converted to canonical ml", async () => {
    renderConverter("");
    fireEvent.change(screen.getByRole("textbox", { name: "Water" }), {
      target: { value: "2" },
    });
    expect(onChange).toHaveBeenCalledWith(473.176473);
    await waitFor(() => {});
  });
});

describe("prop overrides", () => {
  it("allows overriding decimalScale", async () => {
    renderConverter(237, { decimalScale: 4 });
    expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue(
      "1.0017",
    );
    await waitFor(() => {});
  });
});

describe("fluid ounce unit", () => {
  it("is selectable and displays the converted value", async () => {
    renderConverter(29.5735295625);
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(
      screen.getByRole("option", { name: "Fluid Ounce (fl oz)" }),
    );

    expect(screen.getByRole("combobox")).toHaveValue("Fluid Ounce (fl oz)");
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue("1"),
    );
  });

  it("calls onChange with the value converted to canonical ml", async () => {
    renderConverter("");
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(
      screen.getByRole("option", { name: "Fluid Ounce (fl oz)" }),
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Water" }), {
      target: { value: "2" },
    });
    expect(onChange).toHaveBeenCalledWith(59.147059125);
    await waitFor(() => {});
  });
});
