import type { WeightSettingSlug } from "$/frontend/account/preferences-panel";
import {
  type WeightUnit,
  WEIGHT_CONVERSIONS,
  WEIGHT_DEFAULT_UNIT,
} from "$/frontend/shared-components/converter/weight-conversions";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { Select } from "@mantine/core";

interface WeightUnitFieldProps {
  slug: WeightSettingSlug;
  setting: ClientUserAccountSetting | undefined;
  onSave: (input: { slug: WeightSettingSlug; value: WeightUnit }) => void;
}

export default function WeightUnitField({
  slug,
  setting,
  onSave,
}: WeightUnitFieldProps) {
  return (
    <Select
      label={setting?.name}
      description={setting?.description}
      styles={{ description: { minHeight: "2.6em" } }}
      data={WEIGHT_CONVERSIONS.order.map((unit) => ({
        value: unit,
        label: WEIGHT_CONVERSIONS.labels[unit],
      }))}
      value={(setting?.value as WeightUnit | undefined) ?? WEIGHT_DEFAULT_UNIT}
      onChange={(next) => next && onSave({ slug, value: next as WeightUnit })}
      allowDeselect={false}
    />
  );
}
