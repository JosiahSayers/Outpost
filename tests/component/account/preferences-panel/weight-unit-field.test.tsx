import WeightUnitField from "$/frontend/account/preferences-panel/weight-unit-field";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, mock } from "bun:test";

function setting(
  overrides: Partial<ClientUserAccountSetting> = {},
): ClientUserAccountSetting {
  return {
    slug: "weight_viewing_unit",
    name: "Preferred Weight Viewing Unit",
    description: "Unit used to display weight measurements.",
    defaultValue: "grams",
    value: "grams",
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
      <WeightUnitField
        slug="weight_viewing_unit"
        setting={"setting" in props ? props.setting : setting()}
        onSave={onSave}
      />
    </MantineProvider>,
  );
  return onSave;
}

describe("with a setting", () => {
  it("renders the label and description", () => {
    renderField();
    expect(
      screen.getByText("Preferred Weight Viewing Unit"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Unit used to display weight measurements."),
    ).toBeInTheDocument();
  });

  it("renders the setting's current value", () => {
    renderField({ setting: setting({ value: "pounds" }) });
    expect(
      screen.getByRole("combobox", { name: "Preferred Weight Viewing Unit" }),
    ).toHaveValue("Pounds (lb)");
  });

  it("falls back to the default unit when the value is null", () => {
    renderField({ setting: setting({ value: null }) });
    expect(
      screen.getByRole("combobox", { name: "Preferred Weight Viewing Unit" }),
    ).toHaveValue("Grams (g)");
  });

  it("lists all weight units as options", () => {
    renderField();
    fireEvent.click(
      screen.getByRole("combobox", { name: "Preferred Weight Viewing Unit" }),
    );
    for (const label of [
      "Grams (g)",
      "Kilograms (kg)",
      "Ounces (oz)",
      "Pounds (lb)",
    ]) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
  });

  describe("selecting an option", () => {
    it("calls onSave with the field's slug and the selected unit", () => {
      const onSave = renderField();
      fireEvent.click(
        screen.getByRole("combobox", {
          name: "Preferred Weight Viewing Unit",
        }),
      );
      fireEvent.click(screen.getByRole("option", { name: "Pounds (lb)" }));

      expect(onSave).toHaveBeenCalledTimes(1);
      expect(onSave).toHaveBeenCalledWith({
        slug: "weight_viewing_unit",
        value: "pounds",
      });
    });
  });
});

describe("with no setting", () => {
  it("renders without a label or description", () => {
    renderField({ setting: undefined });
    expect(
      screen.queryByText("Preferred Weight Viewing Unit"),
    ).not.toBeInTheDocument();
  });

  it("falls back to the default unit", () => {
    renderField({ setting: undefined });
    expect(screen.getByRole("combobox")).toHaveValue("Grams (g)");
  });
});
