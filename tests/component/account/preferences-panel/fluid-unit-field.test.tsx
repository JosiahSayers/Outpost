import { AccountSettingsProviderBase } from "$/frontend/account/account-settings-context";
import FluidUnitField from "$/frontend/account/preferences-panel/fluid-unit-field";
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

const onSave = mock(() => {});

function renderField(settings: ClientUserAccountSetting[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(accountSettingsKeys.all, settings);
  render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <AccountSettingsProviderBase isAuthenticated>
          <FluidUnitField slug="liquid_viewing_unit" onSave={onSave} />
        </AccountSettingsProviderBase>
      </MantineProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  onSave.mockReset();
});

describe("with a setting", () => {
  it("renders the label and description", async () => {
    renderField([setting()]);
    expect(
      screen.getByText("Preferred Liquid Viewing Unit"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Unit used to display liquid measurements."),
    ).toBeInTheDocument();
    await waitFor(() => {});
  });

  it("renders the setting's current value", async () => {
    renderField([setting({ value: "cupsUS" })]);
    expect(
      screen.getByRole("combobox", { name: "Preferred Liquid Viewing Unit" }),
    ).toHaveValue("Cups (US)");
    await waitFor(() => {});
  });

  it("falls back to the region-detected unit (cupsUS in en-US) when the value is null", async () => {
    renderField([setting({ value: null })]);
    expect(
      screen.getByRole("combobox", { name: "Preferred Liquid Viewing Unit" }),
    ).toHaveValue("Cups (US)");
    await waitFor(() => {});
  });

  it("lists all fluid units as options", async () => {
    renderField([setting()]);
    fireEvent.click(
      screen.getByRole("combobox", { name: "Preferred Liquid Viewing Unit" }),
    );
    for (const label of [
      "Milliliters (mL)",
      "Liters (L)",
      "Cups (US)",
      "Fluid Ounce (fl oz)",
      "Cups (Imperial)",
    ]) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
    await waitFor(() => {});
  });

  describe("selecting an option", () => {
    it("calls onSave with the field's slug and the selected unit", async () => {
      renderField([setting()]);
      fireEvent.click(
        screen.getByRole("combobox", {
          name: "Preferred Liquid Viewing Unit",
        }),
      );
      fireEvent.click(screen.getByRole("option", { name: "Cups (US)" }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({
        slug: "liquid_viewing_unit",
        value: "cupsUS",
      });
      await waitFor(() => {});
    });
  });
});

describe("with no matching setting in the loaded list", () => {
  it("renders without a label or description", async () => {
    renderField([]);
    expect(
      screen.queryByText("Preferred Liquid Viewing Unit"),
    ).not.toBeInTheDocument();
    await waitFor(() => {});
  });

  it("falls back to the region-detected unit (cupsUS in en-US)", async () => {
    renderField([]);
    expect(screen.getByRole("combobox")).toHaveValue("Cups (US)");
    await waitFor(() => {});
  });
});
