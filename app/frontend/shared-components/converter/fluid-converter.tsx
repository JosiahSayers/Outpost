import { usePreferredUnit } from "$/frontend/account/use-preferred-unit";
import {
  FLUID_CONVERSIONS,
  FLUID_DEFAULT_UNIT,
  FLUID_REGION_DEFAULT_UNIT,
  type FluidUnit,
} from "$/frontend/shared-components/converter/fluid-conversions";
import UnitConverterInput from "$/frontend/shared-components/converter/unit-converter-input";
import type { NumberInputProps, SelectProps } from "@mantine/core";
import { useState } from "react";

interface Props extends Omit<NumberInputProps, "value" | "onChange"> {
  value: number | string;
  onChange: (value: number | string) => void;
  selectProps?: Partial<Omit<SelectProps, "data" | "value" | "onChange">>;
}

// Pre-configured UnitConverterInput for fluid-volume fields (ml canonical):
// wires up the ml/liters/US-cups/Imperial-cups conversion table, a sane
// decimal display, and a starting unit taken from the user's
// liquid_entry_unit account setting (falling back to locale detection if
// unset), so consumers just plug in a canonical-ml value/onChange (e.g.
// straight off form.getInputProps("waterMl")).
export default function FluidConverter({
  value,
  onChange,
  min = 0,
  decimalScale = 2,
  ...numberInputProps
}: Props) {
  const preferredUnit = usePreferredUnit(
    "liquid_entry_unit",
    FLUID_REGION_DEFAULT_UNIT,
    FLUID_DEFAULT_UNIT,
  );
  const [unit, setUnit] = useState<FluidUnit>(preferredUnit);

  return (
    <UnitConverterInput
      value={value}
      onChange={onChange}
      conversions={FLUID_CONVERSIONS}
      unit={unit}
      onUnitChange={setUnit}
      min={min}
      decimalScale={decimalScale}
      {...numberInputProps}
    />
  );
}
