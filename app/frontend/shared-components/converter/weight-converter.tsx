import UnitConverterInput from "$/frontend/shared-components/converter/unit-converter-input";
import { useDefaultUnit } from "$/frontend/shared-components/converter/use-default-unit";
import {
  WEIGHT_CONVERSIONS,
  WEIGHT_DEFAULT_UNIT,
  WEIGHT_REGION_DEFAULT_UNIT,
  type WeightUnit,
} from "$/frontend/shared-components/converter/weight-conversions";
import type { NumberInputProps, SelectProps } from "@mantine/core";
import { useState } from "react";

interface Props extends Omit<NumberInputProps, "value" | "onChange"> {
  value: number | string;
  onChange: (value: number | string) => void;
  selectProps?: Partial<Omit<SelectProps, "data" | "value" | "onChange">>;
}

// Pre-configured UnitConverterInput for weight fields (grams canonical):
// wires up the grams/kilograms/ounces/pounds conversion table, a sane
// decimal display, and a locale-detected starting unit, so consumers just
// plug in a canonical-grams value/onChange (e.g. straight off
// form.getInputProps("grams")).
export default function WeightConverter({
  value,
  onChange,
  min = 0,
  decimalScale = 2,
  ...numberInputProps
}: Props) {
  const detectedUnit = useDefaultUnit(
    WEIGHT_REGION_DEFAULT_UNIT,
    WEIGHT_DEFAULT_UNIT,
  );
  const [unit, setUnit] = useState<WeightUnit>(detectedUnit);

  return (
    <UnitConverterInput
      value={value}
      onChange={onChange}
      conversions={WEIGHT_CONVERSIONS}
      unit={unit}
      onUnitChange={setUnit}
      min={min}
      decimalScale={decimalScale}
      {...numberInputProps}
    />
  );
}
