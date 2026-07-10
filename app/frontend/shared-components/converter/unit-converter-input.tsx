import type { ConversionConfig } from "$/frontend/shared-components/converter/types";
import {
  Group,
  NumberInput,
  Select,
  type NumberInputProps,
  type SelectProps,
} from "@mantine/core";
import { useEffect, useRef, useState } from "react";

interface Props<Unit extends string> extends Omit<
  NumberInputProps,
  "value" | "onChange"
> {
  value: number | string;
  onChange: (value: number | string) => void;
  conversions: ConversionConfig<Unit>;
  unit: Unit;
  onUnitChange: (unit: Unit) => void;
  selectProps?: Partial<Omit<SelectProps, "data" | "value" | "onChange">>;
}

// Rounds to decimalScale ourselves before handing the value to Mantine's
// NumberInput. Mantine's own decimalScale only limits the max decimals shown
// — it doesn't round the underlying value, so leftover float noise from
// unit division (e.g. 1 cup stored as 237ml displays as 1.0017404...) gets
// truncated to trailing zeros ("1.00") instead of collapsing to a clean "1".
function roundToScale(n: number, decimalScale: number | undefined): number {
  if (decimalScale === undefined) return n;
  const factor = 10 ** decimalScale;
  return Math.round(n * factor) / factor;
}

export default function UnitConverterInput<Unit extends string>({
  value,
  onChange,
  conversions,
  unit,
  onUnitChange,
  selectProps,
  mb,
  mt,
  ...numberInputProps
}: Props<Unit>) {
  const multiplier = conversions.multipliers[unit];
  const decimalScale = numberInputProps.decimalScale;
  const deriveDisplay = (v: number | string, m: number): number | string =>
    typeof v === "number" ? roundToScale(v / m, decimalScale) : "";

  // Mirrors `value`/`unit` into local state so the displayed text can be
  // edited freely (e.g. keeping a trailing "1." on screen while the
  // committed canonical value is already 1) without every keystroke's
  // round-trip through the parent clobbering what's on screen. The effect
  // below only re-derives the display from `value`/`unit` when they change
  // for a reason other than our own last commit — an external reset or a
  // unit switch — so in-progress typing isn't stomped by its own echo.
  const [displayValue, setDisplayValue] = useState(() =>
    deriveDisplay(value, multiplier),
  );
  const lastCommitted = useRef(value);
  const lastUnit = useRef(unit);

  useEffect(() => {
    if (value !== lastCommitted.current || unit !== lastUnit.current) {
      setDisplayValue(deriveDisplay(value, multiplier));
      lastCommitted.current = value;
      lastUnit.current = unit;
    }
  }, [value, unit, multiplier, decimalScale]);

  const commit = (canonicalValue: number | string) => {
    lastCommitted.current = canonicalValue;
    onChange(canonicalValue);
  };

  // Falls back to "<field label> unit" so the unit Select has a distinct
  // accessible name even when a page renders more than one of these inputs
  // (e.g. Water and Dry weight side by side) — otherwise they're both
  // unnamed comboboxes and impossible to target individually.
  const defaultSelectLabel =
    typeof numberInputProps.label === "string"
      ? `${numberInputProps.label} unit`
      : undefined;

  return (
    <Group grow align="flex-end" mb={mb} mt={mt}>
      <NumberInput
        value={displayValue}
        onChange={(val) => {
          setDisplayValue(val);
          if (typeof val === "number") {
            commit(val * multiplier);
            return;
          }
          if (val === "") {
            commit("");
            return;
          }
          // Mantine passes back an in-progress string rather than a parsed
          // number while the user is mid-way through typing a decimal (e.g.
          // a trailing "1."). Commit the numeric value it already
          // represents so the canonical value doesn't go stale — e.g.
          // backspacing "1.75" down to "1." must commit as 1, not stay at
          // the last fully-parsed 1.7 — while the displayed text (set
          // above) keeps showing exactly what was typed, dot and all.
          const parsed = Number(val);
          if (!Number.isNaN(parsed)) commit(parsed * multiplier);
        }}
        {...numberInputProps}
      />
      <Select
        aria-label={defaultSelectLabel}
        data={conversions.order.map((u) => ({
          value: u,
          label: conversions.labels[u],
        }))}
        value={unit}
        onChange={(val) => {
          if (val) onUnitChange(val as Unit);
        }}
        allowDeselect={false}
        {...selectProps}
      />
    </Group>
  );
}
