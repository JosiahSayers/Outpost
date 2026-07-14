import FluidUnitField from "$/frontend/account/preferences-panel/fluid-unit-field";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

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

function renderField(
  props: Partial<{
    setting: ClientUserAccountSetting | undefined;
    onSave: (input: { slug: string; value: string }) => void;
  }> = {},
) {
  const onSave = props.onSave ?? mock();
  render(
    <MantineProvider>
      <FluidUnitField
        slug="liquid_viewing_unit"
        setting={"setting" in props ? props.setting : setting()}
        onSave={onSave}
      />
    </MantineProvider>,
  );
  return onSave;
}

describe("with a setting", () => {
  it("renders the label and description", async () => {
    renderField();
    expect(
      screen.getByText("Preferred Liquid Viewing Unit"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Unit used to display liquid measurements."),
    ).toBeInTheDocument();
    await waitFor(() => {});
  });

  it("renders the setting's current value", async () => {
    renderField({ setting: setting({ value: "cupsUS" }) });
    expect(
      screen.getByRole("combobox", { name: "Preferred Liquid Viewing Unit" }),
    ).toHaveValue("Cups (US)");
    await waitFor(() => {});
  });

  it("falls back to the default unit when the value is null", async () => {
    renderField({ setting: setting({ value: null }) });
    expect(
      screen.getByRole("combobox", { name: "Preferred Liquid Viewing Unit" }),
    ).toHaveValue("Milliliters (mL)");
    await waitFor(() => {});
  });

  it("lists all fluid units as options", async () => {
    renderField();
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
      const onSave = renderField();
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

describe("with no setting", () => {
  it("renders without a label or description", async () => {
    renderField({ setting: undefined });
    expect(
      screen.queryByText("Preferred Liquid Viewing Unit"),
    ).not.toBeInTheDocument();
    await waitFor(() => {});
  });

  it("falls back to the default unit", async () => {
    renderField({ setting: undefined });
    expect(screen.getByRole("combobox")).toHaveValue("Milliliters (mL)");
    await waitFor(() => {});
  });
});
