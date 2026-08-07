import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";
import { usePreferredBoolean } from "$/frontend/account/use-preferred-boolean";
import { Switch, type SwitchProps } from "@mantine/core";

interface WeightRollupFieldProps extends Pick<SwitchProps, "mt"> {
  slug: "weight_rollup";
  onSave: (input: { slug: "weight_rollup"; value: "true" | "false" }) => void;
}

export default function WeightRollupField({
  slug,
  onSave,
  mt,
}: WeightRollupFieldProps) {
  const { settings } = useAccountSettingsContext();
  const setting = settings?.find((s) => s.slug === slug);
  const enabled = usePreferredBoolean(slug, true);

  return (
    <Switch
      label={setting?.name}
      description={setting?.description}
      styles={{ description: { minHeight: "2.6em" } }}
      checked={enabled}
      onChange={(event) =>
        onSave({
          slug,
          value: event.currentTarget.checked ? "true" : "false",
        })
      }
      mt={mt}
    />
  );
}
