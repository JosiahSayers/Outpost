import { AccountSettingsProviderBase } from "$/frontend/account/account-settings-context";
import { accountSettingsKeys } from "$/frontend/utils/api/account-settings";
import { useFluidDisplay } from "$/frontend/utils/hooks/unit-conversion/use-fluid-display";
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
    slug: "liquid_viewing_unit",
    name: "Preferred Liquid Viewing Unit",
    description: "Unit used to display liquid measurements.",
    defaultValue: null,
    value: null,
    ...overrides,
  };
}

function Display({ ml }: { ml: number }) {
  const formatFluid = useFluidDisplay();
  return <div data-testid="fluid">{formatFluid(ml)}</div>;
}

function renderDisplay(ml: number, settings?: ClientUserAccountSetting[]) {
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
          <Display ml={ml} />
        </AccountSettingsProviderBase>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

describe("with no stored liquid_viewing_unit setting", () => {
  it("falls back to the locale-detected unit (cupsUS in en-US)", () => {
    renderDisplay(236.5882365);
    expect(screen.getByTestId("fluid")).toHaveTextContent("1 cups");
  });
});

describe("with a stored liquid_viewing_unit setting", () => {
  it("displays using the stored unit instead of the locale default", () => {
    renderDisplay(2000, [setting({ value: "liters" })]);
    expect(screen.getByTestId("fluid")).toHaveTextContent("2 L");
  });
});
