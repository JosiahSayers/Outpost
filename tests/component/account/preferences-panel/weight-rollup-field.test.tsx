import { AccountSettingsProviderBase } from "$/frontend/account/account-settings-context";
import WeightRollupField from "$/frontend/account/preferences-panel/weight-rollup-field";
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
    slug: "weight_rollup",
    name: "Roll up large totals",
    description: "Show large totals as whole units plus a remainder.",
    defaultValue: "true",
    value: "true",
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
          <WeightRollupField slug="weight_rollup" onSave={onSave} />
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
    expect(screen.getByText("Roll up large totals")).toBeInTheDocument();
    expect(
      screen.getByText("Show large totals as whole units plus a remainder."),
    ).toBeInTheDocument();
    await waitFor(() => {});
  });

  it("reflects an enabled value", async () => {
    renderField([setting({ value: "true" })]);
    expect(screen.getByRole("switch")).toBeChecked();
    await waitFor(() => {});
  });

  it("reflects a disabled value", async () => {
    renderField([setting({ value: "false" })]);
    expect(screen.getByRole("switch")).not.toBeChecked();
    await waitFor(() => {});
  });

  it("falls back to enabled when the value is null", async () => {
    renderField([setting({ value: null })]);
    expect(screen.getByRole("switch")).toBeChecked();
    await waitFor(() => {});
  });

  describe("toggling the switch", () => {
    it("calls onSave with the field's slug and the new value", async () => {
      renderField([setting({ value: "true" })]);
      fireEvent.click(screen.getByRole("switch"));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({
        slug: "weight_rollup",
        value: "false",
      });
      await waitFor(() => {});
    });
  });
});

describe("with no matching setting in the loaded list", () => {
  it("renders without a label or description, but still enabled by default", async () => {
    renderField([]);
    expect(screen.queryByText("Roll up large totals")).not.toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeChecked();
    await waitFor(() => {});
  });
});
