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
