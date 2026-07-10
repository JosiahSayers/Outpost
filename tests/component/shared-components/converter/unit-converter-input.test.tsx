import type { ConversionConfig } from "$/frontend/shared-components/converter/types";
import UnitConverterInput from "$/frontend/shared-components/converter/unit-converter-input";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { useState } from "react";

type TestUnit = "ml" | "cupsUS";

const conversions: ConversionConfig<TestUnit> = {
  order: ["ml", "cupsUS"],
  labels: { ml: "Milliliters (mL)", cupsUS: "Cups (US)" },
  multipliers: { ml: 1, cupsUS: 236.5882365 },
};

const onChange = mock(() => {});
const onUnitChange = mock(() => {});

function renderInput(value: number | string, unit: TestUnit) {
  render(
    <MantineProvider>
      <UnitConverterInput
        label="Water"
        value={value}
        onChange={onChange}
        conversions={conversions}
        unit={unit}
        onUnitChange={onUnitChange}
      />
    </MantineProvider>,
  );
}

beforeEach(() => {
  onChange.mockReset();
  onUnitChange.mockReset();
});

describe("displaying the value", () => {
  it("shows the canonical value as-is when unit is ml", async () => {
    renderInput(473, "ml");
    expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue("473");
    await waitFor(() => {});
  });

  it("derives the displayed value from the canonical value and unit", async () => {
    renderInput(473.176473, "cupsUS");
    expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue("2");
    await waitFor(() => {});
  });

  it("stays empty when the canonical value is empty", async () => {
    renderInput("", "cupsUS");
    expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue("");
    await waitFor(() => {});
  });

  it("doesn't show trailing zeros from float noise when decimalScale is set", async () => {
    // 1 cup rounded to the nearest ml (237) and converted back to cups isn't
    // exactly 1 (1.0017404...) — decimalScale should collapse that back to a
    // clean "1" rather than Mantine's raw "1.00".
    render(
      <MantineProvider>
        <UnitConverterInput
          label="Water"
          decimalScale={2}
          value={237}
          onChange={onChange}
          conversions={conversions}
          unit="cupsUS"
          onUnitChange={onUnitChange}
        />
      </MantineProvider>,
    );
    expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue("1");
    await waitFor(() => {});
  });
});

describe("typing a number", () => {
  it("calls onChange with the value converted to canonical units", async () => {
    renderInput("", "cupsUS");
    fireEvent.change(screen.getByRole("textbox", { name: "Water" }), {
      target: { value: "2" },
    });
    expect(onChange).toHaveBeenCalledWith(473.176473);
    await waitFor(() => {});
  });
});

describe("typing a decimal", () => {
  function Wrapper({ unit }: { unit: TestUnit }) {
    const [value, setValue] = useState<number | string>("");
    return (
      <UnitConverterInput
        label="Water"
        value={value}
        onChange={setValue}
        conversions={conversions}
        unit={unit}
        onUnitChange={() => {}}
      />
    );
  }

  it("does not clear the input when a trailing decimal point is typed", async () => {
    render(
      <MantineProvider>
        <Wrapper unit="ml" />
      </MantineProvider>,
    );
    const input = screen.getByRole("textbox", {
      name: "Water",
    }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "1" } });
    await waitFor(() => {});
    fireEvent.change(input, { target: { value: "1." } });
    await waitFor(() => {});

    expect(input).toHaveValue("1.");
  });

  it("builds up the full decimal value as typing continues", async () => {
    render(
      <MantineProvider>
        <Wrapper unit="ml" />
      </MantineProvider>,
    );
    const input = screen.getByRole("textbox", {
      name: "Water",
    }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "1" } });
    await waitFor(() => {});
    fireEvent.change(input, { target: { value: "1." } });
    await waitFor(() => {});
    fireEvent.change(input, { target: { value: "1.5" } });
    await waitFor(() => {});

    expect(input).toHaveValue("1.5");
  });

  it("calls onChange with the parsed decimal value converted to canonical units", async () => {
    const spy = mock((value: number | string) => value);
    function SpyWrapper() {
      const [value, setValue] = useState<number | string>("");
      return (
        <UnitConverterInput
          label="Water"
          value={value}
          onChange={(val) => {
            spy(val);
            setValue(val);
          }}
          conversions={conversions}
          unit="cupsUS"
          onUnitChange={() => {}}
        />
      );
    }
    render(
      <MantineProvider>
        <SpyWrapper />
      </MantineProvider>,
    );
    const input = screen.getByRole("textbox", {
      name: "Water",
    }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "1" } });
    await waitFor(() => {});
    fireEvent.change(input, { target: { value: "1." } });
    await waitFor(() => {});
    fireEvent.change(input, { target: { value: "1.5" } });
    await waitFor(() => {});

    expect(spy).toHaveBeenLastCalledWith(354.88235475);
  });

  it("commits the value shown when backspacing down to a trailing decimal point, not a stale earlier value", async () => {
    // Regression test: erasing "1.75" down to "1." must commit onChange(1),
    // not leave the canonical value stuck at the last fully-parsed 1.7 —
    // otherwise saving the form mid-edit persists the stale 1.7.
    const spy = mock((value: number | string) => value);
    function SpyWrapper() {
      const [value, setValue] = useState<number | string>(1.75);
      return (
        <UnitConverterInput
          label="Water"
          value={value}
          onChange={(val) => {
            spy(val);
            setValue(val);
          }}
          conversions={conversions}
          unit="ml"
          onUnitChange={() => {}}
        />
      );
    }
    render(
      <MantineProvider>
        <SpyWrapper />
      </MantineProvider>,
    );
    const input = screen.getByRole("textbox", {
      name: "Water",
    }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "1.7" } });
    await waitFor(() => {});
    fireEvent.change(input, { target: { value: "1." } });
    await waitFor(() => {});

    expect(input).toHaveValue("1.");
    expect(spy).toHaveBeenLastCalledWith(1);
  });

  it("keeps the trailing decimal point on screen after backspacing so typing can continue", async () => {
    function Wrapper2() {
      const [value, setValue] = useState<number | string>(1.75);
      return (
        <UnitConverterInput
          label="Water"
          value={value}
          onChange={setValue}
          conversions={conversions}
          unit="ml"
          onUnitChange={() => {}}
        />
      );
    }
    render(
      <MantineProvider>
        <Wrapper2 />
      </MantineProvider>,
    );
    const input = screen.getByRole("textbox", {
      name: "Water",
    }) as HTMLInputElement;

    fireEvent.change(input, { target: { value: "1.7" } });
    await waitFor(() => {});
    fireEvent.change(input, { target: { value: "1." } });
    await waitFor(() => {});
    fireEvent.change(input, { target: { value: "1.7" } });
    await waitFor(() => {});

    expect(input).toHaveValue("1.7");
  });
});

describe("switching units", () => {
  it("calls onUnitChange with the newly selected unit", async () => {
    renderInput(473, "ml");
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Cups (US)" }));
    expect(onUnitChange).toHaveBeenCalledWith("cupsUS");
    await waitFor(() => {});
  });

  it("re-derives the displayed number once the unit prop changes, preserving the real value", async () => {
    function Wrapper() {
      const [unit, setUnit] = useState<TestUnit>("cupsUS");
      return (
        <UnitConverterInput
          label="Water"
          value={473.176473}
          onChange={() => {}}
          conversions={conversions}
          unit={unit}
          onUnitChange={setUnit}
        />
      );
    }
    render(
      <MantineProvider>
        <Wrapper />
      </MantineProvider>,
    );

    expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue("2");

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: "Milliliters (mL)" }));

    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "Water" })).toHaveValue(
        "473.176473",
      ),
    );
  });
});
