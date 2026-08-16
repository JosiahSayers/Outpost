import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";
import { usePreferredUnit } from "$/frontend/account/use-preferred-unit";
import {
  WEIGHT_CONVERSIONS,
  WEIGHT_DEFAULT_UNIT,
  WEIGHT_ENTRY_UNIT_OPTIONS,
  WEIGHT_REGION_DEFAULT_UNIT,
  type WeightEntryUnit,
  type WeightUnit,
} from "$/frontend/shared-components/converter/weight-conversions";
import { Select } from "@mantine/core";

// Pounds & Ounces is a valid weight_entry_unit value but has no meaning for
// weight_viewing_unit -- BTP-93's weight_rollup setting already covers
// lb+oz roll-up for display -- so the two slugs get distinct prop shapes
// rather than a single loose union that would let a viewing field claim to
// support it.
type WeightUnitFieldProps =
  | {
      slug: "weight_viewing_unit";
      onSave: (input: {
        slug: "weight_viewing_unit";
        value: WeightUnit;
      }) => void;
    }
  | {
      slug: "weight_entry_unit";
      onSave: (input: {
        slug: "weight_entry_unit";
        value: WeightEntryUnit;
      }) => void;
    };

export default function WeightUnitField(props: WeightUnitFieldProps) {
  const { slug } = props;
  const { settings } = useAccountSettingsContext();
  const setting = settings?.find((s) => s.slug === slug);
  // Same resolution the trip/gear-inventory pages use for this setting: the
  // stored value if the user has set one, otherwise the region-detected
  // default — so this select and those pages always agree on what "unset"
  // means.
  const selectedUnit = usePreferredUnit<WeightEntryUnit>(
    slug,
    WEIGHT_REGION_DEFAULT_UNIT,
    WEIGHT_DEFAULT_UNIT,
  );

  const options =
    slug === "weight_entry_unit"
      ? WEIGHT_ENTRY_UNIT_OPTIONS
      : WEIGHT_CONVERSIONS.order.map((unit) => ({
          value: unit as string,
          label: WEIGHT_CONVERSIONS.labels[unit],
        }));

  return (
    <Select
      label={setting?.name}
      description={setting?.description}
      styles={{ description: { minHeight: "2.6em" } }}
      data={options}
      value={selectedUnit}
      onChange={(next) => {
        if (!next) return;
        if (props.slug === "weight_entry_unit") {
          props.onSave({
            slug: "weight_entry_unit",
            value: next as WeightEntryUnit,
          });
        } else {
          props.onSave({
            slug: "weight_viewing_unit",
            value: next as WeightUnit,
          });
        }
      }}
      allowDeselect={false}
    />
  );
}
