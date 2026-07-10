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

export default function UnitConverterInput<Unit extends string>({
  value,
  onChange,
  conversions,
  unit,
  onUnitChange,
  selectProps,
  ...numberInputProps
}: Props<Unit>) {
  const multiplier = conversions.multipliers[unit];
  const displayValue = typeof value === "number" ? value / multiplier : "";

  return (
    <Group grow align="flex-end">
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
