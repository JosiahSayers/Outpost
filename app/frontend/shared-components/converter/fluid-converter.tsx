import UnitConverterInput from "$/frontend/shared-components/converter/unit-converter-input";
import { useDefaultUnit } from "$/frontend/shared-components/converter/use-default-unit";
import {
  WATER_CONVERSIONS,
  WATER_DEFAULT_UNIT,
  WATER_REGION_DEFAULT_UNIT,
  type WaterUnit,
} from "$/frontend/shared-components/converter/water-conversions";
import type { NumberInputProps, SelectProps } from "@mantine/core";
import { useState } from "react";

interface Props extends Omit<NumberInputProps, "value" | "onChange"> {
  value: number | string;
  onChange: (value: number | string) => void;
  selectProps?: Partial<Omit<SelectProps, "data" | "value" | "onChange">>;
}

// Pre-configured UnitConverterInput for fluid-volume fields (ml canonical):
// wires up the ml/liters/US-cups/Imperial-cups conversion table, a sane
// decimal display, and a locale-detected starting unit, so consumers just
// plug in a canonical-ml value/onChange (e.g. straight off
// form.getInputProps("waterMl")).
export default function FluidConverter({
  value,
  onChange,
  min = 0,
  decimalScale = 2,
  ...numberInputProps
}: Props) {
  const detectedUnit = useDefaultUnit(
    WATER_REGION_DEFAULT_UNIT,
    WATER_DEFAULT_UNIT,
  );
  const [unit, setUnit] = useState<WaterUnit>(detectedUnit);

  return (
    <UnitConverterInput
      value={value}
      onChange={onChange}
      conversions={WATER_CONVERSIONS}
      unit={unit}
      onUnitChange={setUnit}
      min={min}
      decimalScale={decimalScale}
      {...numberInputProps}
    />
  );
}
