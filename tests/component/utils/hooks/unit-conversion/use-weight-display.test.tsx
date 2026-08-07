import { AccountSettingsProviderBase } from "$/frontend/account/account-settings-context";
import { accountSettingsKeys } from "$/frontend/utils/api/account-settings";
import { useWeightDisplay } from "$/frontend/utils/hooks/unit-conversion/use-weight-display";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "bun:test";

function setting(
  overrides: Partial<ClientUserAccountSetting> = {},
): ClientUserAccountSetting {
  return {
    slug: "weight_viewing_unit",
    name: "Preferred Weight Viewing Unit",
    description: "Unit used to display weight measurements.",
    defaultValue: null,
    value: null,
    ...overrides,
  };
}

function Display({ grams }: { grams: number }) {
  const formatWeight = useWeightDisplay();
  return <div data-testid="weight">{formatWeight(grams)}</div>;
}

function renderDisplay(grams: number, settings?: ClientUserAccountSetting[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  if (settings) {
    queryClient.setQueryData(accountSettingsKeys.all, settings);
  }
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AccountSettingsProviderBase isAuthenticated={!!settings}>
          <Display grams={grams} />
        </AccountSettingsProviderBase>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("with no stored weight_viewing_unit setting", () => {
  it("falls back to the locale-detected unit (ounces in en-US)", () => {
    renderDisplay(28.349523125);
    expect(screen.getByTestId("weight")).toHaveTextContent("1 oz");
  });
});

describe("with a stored weight_viewing_unit setting", () => {
  it("displays using the stored unit instead of the locale default", () => {
    renderDisplay(1000, [setting({ value: "kilograms" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("1 kg");
  });
});

describe("pluralization", () => {
  it("keeps pounds singular for exactly 1 lb", () => {
    renderDisplay(453.59237, [setting({ value: "pounds" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("1 lb");
  });

  it("pluralizes pounds for a decimal value other than 1", () => {
    renderDisplay(453.59237 * 1.5, [setting({ value: "pounds" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("1.5 lbs");
  });

  it("pluralizes pounds for a decimal value below 1", () => {
    renderDisplay(453.59237 * 0.5, [setting({ value: "pounds" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("0.5 lbs");
  });

  it("does not pluralize grams", () => {
    renderDisplay(1000, [setting({ value: "grams" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("1,000 g");
  });

  it("does not pluralize kilograms", () => {
    renderDisplay(2000, [setting({ value: "kilograms" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("2 kg");
  });

  it("does not pluralize ounces", () => {
    renderDisplay(2 * 28.349523125, [setting({ value: "ounces" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("2 oz");
  });
});

describe("rollup (on by default)", () => {
  it("rolls up past the threshold into whole units plus a remainder", () => {
    // 24 oz = 1.5 lb
    renderDisplay(24 * 28.349523125, [setting({ value: "ounces" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("1 lb 8 oz");
  });

  it("omits the remainder when it rolls up evenly", () => {
    // 32 oz = 2 lb
    renderDisplay(32 * 28.349523125, [setting({ value: "ounces" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("2 lbs");
  });

  it("rounds a fractional remainder to the nearest whole unit", () => {
    // 25.3 oz = 1 lb 9.3 oz -> rounds to 1 lb 9 oz
    renderDisplay(25.3 * 28.349523125, [setting({ value: "ounces" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("1 lb 9 oz");
  });

  it("carries the remainder into the whole unit when it rounds up to a full unit", () => {
    // 31.6 oz = 1 lb 15.6 oz -> rounds to 1 lb 16 oz -> carries to 2 lb
    renderDisplay(31.6 * 28.349523125, [setting({ value: "ounces" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("2 lbs");
  });

  it("does not roll up below the threshold", () => {
    // 20 oz = 1.25 lb, below the 1.5 lb threshold
    renderDisplay(20 * 28.349523125, [setting({ value: "ounces" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("20 oz");
  });

  it("rolls up grams into kilograms plus a remainder", () => {
    renderDisplay(1500, [setting({ value: "grams" })]);
    expect(screen.getByTestId("weight")).toHaveTextContent("1 kg 500 g");
  });
});

describe("with the weight_rollup account setting disabled", () => {
  it("shows a plain decimal instead of rolling up", () => {
    // 24 oz = 1.5 lb, above the rollup threshold
    renderDisplay(24 * 28.349523125, [
      setting({ value: "ounces" }),
      {
        slug: "weight_rollup",
        name: "Roll up large totals",
        description: "Show large totals as whole units plus a remainder.",
        defaultValue: "true",
        value: "false",
      },
    ]);
    expect(screen.getByTestId("weight")).toHaveTextContent("24 oz");
  });
});
