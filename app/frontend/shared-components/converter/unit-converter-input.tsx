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

  return (
    <Group grow align="flex-end" mb={mb} mt={mt}>
      <NumberInput
        value={displayValue}
        onChange={(val) =>
          onChange(typeof val === "number" ? val * multiplier : "")
        }
        {...numberInputProps}
      />
      <Select
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
