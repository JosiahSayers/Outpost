import { AccountSettingsProviderBase } from "$/frontend/account/account-settings-context";
import WeightConverter from "$/frontend/shared-components/converter/weight-converter";
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
      <WeightConverter
        label="Weight"
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
          <WeightConverter label="Weight" value={value} onChange={onChange} />
        </AccountSettingsProviderBase>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  onChange.mockReset();
});

describe("default unit detection", () => {
  it("defaults to Ounces (oz) in the en-US test environment", async () => {
    renderConverter(28.349523125);
    expect(screen.getByRole("combobox")).toHaveValue("Ounces (oz)");
    await waitFor(() => {});
  });

  it("uses the stored weight_entry_unit account setting instead of the locale default", async () => {
    renderConverterWithSetting(1000, {
      slug: "weight_entry_unit",
      name: "Preferred Weight Entry Unit",
      description: "Unit used when entering weight measurements.",
      defaultValue: null,
      value: "kilograms",
    });
    expect(screen.getByRole("combobox")).toHaveValue("Kilograms (kg)");
    await waitFor(() => {});
  });
});

describe("default decimal display", () => {
  it("rounds to 2 decimals, collapsing float noise instead of showing trailing zeros", async () => {
    // 28.35g (a common gram rounding of 1 oz) converts back to ~1.0000168 oz.
    renderConverter(28.35);
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("1");
    await waitFor(() => {});
  });
});

describe("typing a number", () => {
  it("calls onChange with the value converted to canonical grams", async () => {
    renderConverter("");
    fireEvent.change(screen.getByRole("textbox", { name: "Weight" }), {
      target: { value: "2" },
    });
    expect(onChange).toHaveBeenCalledWith(56.69904625);
    await waitFor(() => {});
  });
});

describe("prop overrides", () => {
  it("allows overriding decimalScale", async () => {
    renderConverter(28, { decimalScale: 4 });
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue(
      "0.9877",
    );
    await waitFor(() => {});
  });
});
