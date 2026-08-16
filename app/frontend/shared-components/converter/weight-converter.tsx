import { usePreferredUnit } from "$/frontend/account/use-preferred-unit";
import PoundsOuncesInput from "$/frontend/shared-components/converter/pounds-ounces-input";
import UnitConverterInput from "$/frontend/shared-components/converter/unit-converter-input";
import {
  POUNDS_AND_OUNCES,
  WEIGHT_CONVERSIONS,
  WEIGHT_DEFAULT_UNIT,
  WEIGHT_ENTRY_UNIT_OPTIONS,
  WEIGHT_REGION_DEFAULT_UNIT,
  type WeightEntryUnit,
} from "$/frontend/shared-components/converter/weight-conversions";
import {
  Group,
  Select,
  type NumberInputProps,
  type SelectProps,
} from "@mantine/core";
import { useState } from "react";

interface Props extends Omit<NumberInputProps, "value" | "onChange"> {
  value: number | string;
  onChange: (value: number | string) => void;
  selectProps?: Partial<Omit<SelectProps, "data" | "value" | "onChange">>;
}

// Pre-configured weight field (grams canonical): wires up the
// grams/kilograms/ounces/pounds conversion table, a sane decimal display,
// and a starting unit taken from the user's weight_entry_unit account
// setting (falling back to locale detection if unset), so consumers just
// plug in a canonical-grams value/onChange (e.g. straight off
// form.getInputProps("grams")).
//
// The unit Select always lists "Pounds & Ounces" alongside the four real
// WeightUnits (WEIGHT_ENTRY_UNIT_OPTIONS), so switching in and out of the
// split-field entry mode doesn't require a trip to account settings. When
// that option is selected, PoundsOuncesInput's two compact lb/oz fields
// replace UnitConverterInput's single value field, sharing this same Select
// rather than each rendering their own.
export default function WeightConverter({
  value,
  onChange,
  min = 0,
  decimalScale = 2,
  selectProps,
  mb,
  mt,
  label,
  ...numberInputProps
}: Props) {
  const preferredUnit = usePreferredUnit<WeightEntryUnit>(
    "weight_entry_unit",
    WEIGHT_REGION_DEFAULT_UNIT,
    WEIGHT_DEFAULT_UNIT,
  );
  const [unit, setUnit] = useState<WeightEntryUnit>(preferredUnit);

  // Falls back to "<field label> unit" so the unit Select has a distinct
  // accessible name even when a page renders more than one of these inputs
  // (e.g. Water and Dry weight side by side) — mirrors
  // UnitConverterInput's own fallback, which this Select replaces.
  const defaultSelectLabel =
    typeof label === "string" ? `${label} unit` : undefined;

  const unitSelect = (
    <Select
      aria-label={defaultSelectLabel}
      data={WEIGHT_ENTRY_UNIT_OPTIONS}
      value={unit}
      onChange={(next) => next && setUnit(next as WeightEntryUnit)}
      allowDeselect={false}
      {...selectProps}
    />
  );

  if (unit === POUNDS_AND_OUNCES) {
    return (
      <Group align="flex-end" gap="xs" mb={mb} mt={mt} wrap="nowrap">
        <PoundsOuncesInput
          value={value}
          onChange={onChange}
          label={label}
          min={min}
          {...numberInputProps}
        />
        <div style={{ flex: 1, minWidth: 0 }}>{unitSelect}</div>
      </Group>
    );
  }

  return (
    <Group grow align="flex-end" mb={mb} mt={mt}>
      <UnitConverterInput
        value={value}
        onChange={onChange}
        conversions={WEIGHT_CONVERSIONS}
        unit={unit}
        hideSelect
        label={label}
        min={min}
        decimalScale={decimalScale}
        {...numberInputProps}
      />
      {unitSelect}
    </Group>
  );
}
