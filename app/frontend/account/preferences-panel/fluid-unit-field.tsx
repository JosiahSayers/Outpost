import type { FluidSettingSlug } from "$/frontend/account/preferences-panel";
import {
  type FluidUnit,
  FLUID_CONVERSIONS,
  FLUID_DEFAULT_UNIT,
} from "$/frontend/shared-components/converter/fluid-conversions";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { Select } from "@mantine/core";

interface FluidUnitFieldProps {
  slug: FluidSettingSlug;
  setting: ClientUserAccountSetting | undefined;
  onSave: (input: { slug: FluidSettingSlug; value: FluidUnit }) => void;
}

export default function FluidUnitField({
  slug,
  setting,
  onSave,
}: FluidUnitFieldProps) {
  return (
    <Select
      label={setting?.name}
      description={setting?.description}
      styles={{ description: { minHeight: "2.6em" } }}
      data={FLUID_CONVERSIONS.order.map((unit) => ({
        value: unit,
        label: FLUID_CONVERSIONS.labels[unit],
      }))}
      value={(setting?.value as FluidUnit | undefined) ?? FLUID_DEFAULT_UNIT}
      onChange={(next) => next && onSave({ slug, value: next as FluidUnit })}
      allowDeselect={false}
    />
  );
}
