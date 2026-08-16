import {
  WEIGHT_CONVERSIONS,
  WeightUnit,
} from "$/frontend/shared-components/converter/weight-conversions";
import { NumberInput, type NumberInputProps } from "@mantine/core";
import { useEffect, useRef, useState } from "react";

// Both fields hold small whole numbers (0-999 lb, 0-15 oz), so they're
// rendered much narrower than a typical NumberInput -- this leaves room for
// WeightConverter to place its unit Select in the same row rather than
// pushing it below.
const FIELD_WIDTH = 80;

const POUNDS_IN_GRAMS = WEIGHT_CONVERSIONS.multipliers[WeightUnit.pounds];
const OUNCES_IN_GRAMS = WEIGHT_CONVERSIONS.multipliers[WeightUnit.ounces];
const OUNCES_PER_POUND = POUNDS_IN_GRAMS / OUNCES_IN_GRAMS;

interface Props extends Omit<NumberInputProps, "value" | "onChange"> {
  value: number | string;
  onChange: (value: number | string) => void;
}

type Parts = { lb: number | string; oz: number | string };

// Splits a canonical grams value into whole pounds + a rounded ounces
// remainder. Rounding the remainder up to a full pound (e.g. 15.6oz
// rounding to 16oz) carries into the pounds field instead of displaying
// "1 lb 16 oz" -- the same carry-over guard use-weight-display.ts uses for
// rollup display.
function gramsToParts(grams: number): Parts {
  const lb = Math.floor(grams / POUNDS_IN_GRAMS);
  const rawOz = Math.round((grams - lb * POUNDS_IN_GRAMS) / OUNCES_IN_GRAMS);
  return rawOz >= OUNCES_PER_POUND ? { lb: lb + 1, oz: 0 } : { lb, oz: rawOz };
}

function partsToGrams(lb: number | string, oz: number | string): number {
  const lbNumber = typeof lb === "number" ? lb : 0;
  const ozNumber = typeof oz === "number" ? oz : 0;
  return Math.round(lbNumber * POUNDS_IN_GRAMS + ozNumber * OUNCES_IN_GRAMS);
}

function deriveParts(value: number | string): Parts {
  return typeof value === "number" ? gramsToParts(value) : { lb: "", oz: "" };
}

// Pounds+ounces alternative to UnitConverterInput: same canonical-grams
// value/onChange contract, but rendered as two independently-editable
// fields (e.g. "2 lb 8 oz") instead of one value plus a unit select. Used
// by WeightConverter when the user's weight_entry_unit is set to
// "Pounds & Ounces" -- WeightConverter wraps this in its own Group
// alongside the unit Select, so this renders just the two bare fields
// (no margin/layout props of its own).
export default function PoundsOuncesInput({
  value,
  onChange,
  label,
  ...numberInputProps
}: Props) {
  const [parts, setParts] = useState<Parts>(() => deriveParts(value));
  const lastCommitted = useRef(value);

  // Mirrors `value` into local per-field state the same way
  // UnitConverterInput mirrors its single field -- only re-derives from
  // `value` when it changes for a reason other than this component's own
  // last commit, so in-progress typing in one field isn't stomped by the
  // round-trip triggered by committing the other.
  useEffect(() => {
    if (value !== lastCommitted.current) {
      setParts(deriveParts(value));
      lastCommitted.current = value;
    }
  }, [value]);

  const commit = (nextParts: Parts) => {
    const canonical: number | string =
      nextParts.lb === "" && nextParts.oz === ""
        ? ""
        : partsToGrams(nextParts.lb, nextParts.oz);
    lastCommitted.current = canonical;
    onChange(canonical);
  };

  const labelPrefix = typeof label === "string" ? `${label} ` : "";

  return (
    <>
      <NumberInput
        {...numberInputProps}
        label={`${labelPrefix}(lb)`}
        min={numberInputProps.min ?? 0}
        w={FIELD_WIDTH}
        value={parts.lb}
        onChange={(lb) => {
          const nextParts = { ...parts, lb };
          setParts(nextParts);
          commit(nextParts);
        }}
      />
      <NumberInput
        {...numberInputProps}
        label={`${labelPrefix}(oz)`}
        min={numberInputProps.min ?? 0}
        max={OUNCES_PER_POUND - 1}
        w={FIELD_WIDTH}
        value={parts.oz}
        onChange={(oz) => {
          const nextParts = { ...parts, oz };
          setParts(nextParts);
          commit(nextParts);
        }}
      />
    </>
  );
}
