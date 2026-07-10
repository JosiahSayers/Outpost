import type { ConversionConfig } from "$/frontend/shared-components/converter/types";
import {
  Group,
  NumberInput,
  Select,
  type NumberInputProps,
  type SelectProps,
} from "@mantine/core";

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
  const displayValue =
    typeof value === "number"
      ? roundToScale(value / multiplier, numberInputProps.decimalScale)
      : "";
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
          if (typeof val === "number") onChange(val * multiplier);
          else if (val === "") onChange("");
          // Otherwise Mantine is passing back an in-progress string (e.g. a
          // trailing "1." while the user is still typing a decimal) rather
          // than a parsed number. Leave the canonical value alone so the
          // keystroke isn't discarded.
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
