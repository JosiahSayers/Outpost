import type { FluidSettingSlug } from "$/frontend/account/preferences-panel";
import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";
import { usePreferredUnit } from "$/frontend/account/use-preferred-unit";
import {
  type FluidUnit,
  FLUID_CONVERSIONS,
  FLUID_DEFAULT_UNIT,
  FLUID_REGION_DEFAULT_UNIT,
} from "$/frontend/shared-components/converter/fluid-conversions";
import { Select } from "@mantine/core";

interface FluidUnitFieldProps {
  slug: FluidSettingSlug;
  onSave: (input: { slug: FluidSettingSlug; value: FluidUnit }) => void;
}

export default function FluidUnitField({ slug, onSave }: FluidUnitFieldProps) {
  const { settings } = useAccountSettingsContext();
  const setting = settings?.find((s) => s.slug === slug);
  // Same resolution the trip page uses for this setting: the stored value
  // if the user has set one, otherwise the region-detected default — so
  // this select and the trip page always agree on what "unset" means.
  const selectedUnit = usePreferredUnit(
    slug,
    FLUID_REGION_DEFAULT_UNIT,
    FLUID_DEFAULT_UNIT,
  );

  return (
    <Select
      label={setting?.name}
      description={setting?.description}
      styles={{ description: { minHeight: "2.6em" } }}
      data={FLUID_CONVERSIONS.order.map((unit) => ({
        value: unit,
        label: FLUID_CONVERSIONS.labels[unit],
      }))}
      value={selectedUnit}
      onChange={(next) => next && onSave({ slug, value: next as FluidUnit })}
      allowDeselect={false}
    />
  );
}
