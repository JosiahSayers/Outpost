import type { WeightSettingSlug } from "$/frontend/account/preferences-panel";
import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";
import { usePreferredUnit } from "$/frontend/account/use-preferred-unit";
import {
  type WeightUnit,
  WEIGHT_CONVERSIONS,
  WEIGHT_DEFAULT_UNIT,
  WEIGHT_REGION_DEFAULT_UNIT,
} from "$/frontend/shared-components/converter/weight-conversions";
import { Select } from "@mantine/core";

interface WeightUnitFieldProps {
  slug: WeightSettingSlug;
  onSave: (input: { slug: WeightSettingSlug; value: WeightUnit }) => void;
}

export default function WeightUnitField({
  slug,
  onSave,
}: WeightUnitFieldProps) {
  const { settings } = useAccountSettingsContext();
  const setting = settings?.find((s) => s.slug === slug);
  // Same resolution the trip/gear-inventory pages use for this setting: the
  // stored value if the user has set one, otherwise the region-detected
  // default — so this select and those pages always agree on what "unset"
  // means.
  const selectedUnit = usePreferredUnit(
    slug,
    WEIGHT_REGION_DEFAULT_UNIT,
    WEIGHT_DEFAULT_UNIT,
  );

  return (
    <Select
      label={setting?.name}
      description={setting?.description}
      styles={{ description: { minHeight: "2.6em" } }}
      data={WEIGHT_CONVERSIONS.order.map((unit) => ({
        value: unit,
        label: WEIGHT_CONVERSIONS.labels[unit],
      }))}
      value={selectedUnit}
      onChange={(next) => next && onSave({ slug, value: next as WeightUnit })}
      allowDeselect={false}
    />
  );
}
