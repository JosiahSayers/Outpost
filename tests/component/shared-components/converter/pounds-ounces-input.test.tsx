import PoundsOuncesInput from "$/frontend/shared-components/converter/pounds-ounces-input";
import { MantineProvider } from "@mantine/core";
import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { useState } from "react";

const onChange = mock(() => {});

function renderInput(
  value: number | string,
  overrides: Record<string, unknown> = {},
) {
  render(
    <MantineProvider>
      <PoundsOuncesInput
        label="Weight"
        value={value}
        onChange={onChange}
        {...overrides}
      />
    </MantineProvider>,
  );
}

beforeEach(() => {
  onChange.mockReset();
});

describe("displaying the value", () => {
  it("splits a canonical grams value into whole pounds and a rounded ounces remainder", async () => {
    // 2 lb 8 oz = 2*453.59237 + 8*28.349523125 = 1133.98098g, rounds to 1134g
    renderInput(1134);
    expect(screen.getByRole("textbox", { name: "Weight (lb)" })).toHaveValue(
      "2",
    );
    expect(screen.getByRole("textbox", { name: "Weight (oz)" })).toHaveValue(
      "8",
    );
    await waitFor(() => {});
  });

  it("stays empty in both fields when the canonical value is empty", async () => {
    renderInput("");
    expect(screen.getByRole("textbox", { name: "Weight (lb)" })).toHaveValue(
      "",
    );
    expect(screen.getByRole("textbox", { name: "Weight (oz)" })).toHaveValue(
      "",
    );
    await waitFor(() => {});
  });

  it("carries a rounded-up ounces remainder into the pounds field instead of showing 16 oz", async () => {
    // 1 lb 15.9 oz rounds to 1 lb 16 oz, which should carry to 2 lb 0 oz.
    const grams = 453.59237 + 15.9 * 28.349523125;
    renderInput(Math.round(grams));
    expect(screen.getByRole("textbox", { name: "Weight (lb)" })).toHaveValue(
      "2",
    );
    expect(screen.getByRole("textbox", { name: "Weight (oz)" })).toHaveValue(
      "0",
    );
    await waitFor(() => {});
  });
});

describe("typing a value", () => {
  it("calls onChange with the combined canonical grams when pounds changes", async () => {
    renderInput(0);
    fireEvent.change(screen.getByRole("textbox", { name: "Weight (lb)" }), {
      target: { value: "2" },
    });
    expect(onChange).toHaveBeenCalledWith(907); // 2 * 453.59237, rounded
    await waitFor(() => {});
  });

  it("calls onChange with the combined canonical grams when ounces changes", async () => {
    renderInput(0);
    fireEvent.change(screen.getByRole("textbox", { name: "Weight (oz)" }), {
      target: { value: "8" },
    });
    expect(onChange).toHaveBeenCalledWith(227); // 8 * 28.349523125, rounded
    await waitFor(() => {});
  });

  it("combines both fields' values, not just the one most recently changed", async () => {
    function Wrapper() {
      const [value, setValue] = useState<number | string>("");
      return (
        <PoundsOuncesInput label="Weight" value={value} onChange={setValue} />
      );
    }
    render(
      <MantineProvider>
        <Wrapper />
      </MantineProvider>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Weight (lb)" }), {
      target: { value: "2" },
    });
    await waitFor(() => {});
    fireEvent.change(screen.getByRole("textbox", { name: "Weight (oz)" }), {
      target: { value: "8" },
    });
    await waitFor(() => {});

    expect(screen.getByRole("textbox", { name: "Weight (lb)" })).toHaveValue(
      "2",
    );
    expect(screen.getByRole("textbox", { name: "Weight (oz)" })).toHaveValue(
      "8",
    );
  });

  it("treats an empty pounds field as 0 when only ounces is set", async () => {
    renderInput("");
    fireEvent.change(screen.getByRole("textbox", { name: "Weight (oz)" }), {
      target: { value: "4" },
    });
    expect(onChange).toHaveBeenCalledWith(113); // 4 * 28.349523125, rounded
    await waitFor(() => {});
  });

  it("commits an empty canonical value when both fields are cleared", async () => {
    const spy = mock((value: number | string) => value);
    function Wrapper() {
      const [value, setValue] = useState<number | string>(907); // 2 lb 0 oz
      return (
        <PoundsOuncesInput
          label="Weight"
          value={value}
          onChange={(next) => {
            spy(next);
            setValue(next);
          }}
        />
      );
    }
    render(
      <MantineProvider>
        <Wrapper />
      </MantineProvider>,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "Weight (lb)" }), {
      target: { value: "" },
    });
    await waitFor(() => {});
    fireEvent.change(screen.getByRole("textbox", { name: "Weight (oz)" }), {
      target: { value: "" },
    });
    await waitFor(() => {});

    expect(screen.getByRole("textbox", { name: "Weight (lb)" })).toHaveValue(
      "",
    );
    expect(screen.getByRole("textbox", { name: "Weight (oz)" })).toHaveValue(
      "",
    );
    expect(spy).toHaveBeenLastCalledWith("");
  });
});
