import { useAccountSettingsContext } from "$/frontend/account/account-settings-context";
import FluidUnitField from "$/frontend/account/preferences-panel/fluid-unit-field";
import WeightUnitField from "$/frontend/account/preferences-panel/weight-unit-field";
import { type FluidUnit } from "$/frontend/shared-components/converter/fluid-conversions";
import { type WeightUnit } from "$/frontend/shared-components/converter/weight-conversions";
import { useUpdateAccountSetting } from "$/frontend/utils/api/account-settings";
import { notifyError } from "$/frontend/utils/notify-error";
import {
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DropIcon, ScalesIcon } from "@phosphor-icons/react";

export type FluidSettingSlug = "liquid_viewing_unit" | "liquid_entry_unit";
export type WeightSettingSlug = "weight_viewing_unit" | "weight_entry_unit";

export default function PreferencesPanel() {
  const { isPending } = useAccountSettingsContext();
  const updateSetting = useUpdateAccountSetting();

  const savePreference = (
    input:
      | { slug: FluidSettingSlug; value: FluidUnit }
      | { slug: WeightSettingSlug; value: WeightUnit },
  ) => {
    updateSetting.mutate(input, {
      onError: notifyError("Couldn't update preference"),
    });
  };

  if (isPending) {
    return (
      <Center py="xl">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Title order={3}>Units &amp; Preferences</Title>

      <Card>
        <Group gap="sm" mb="md">
          <ThemeIcon variant="light" radius="sm" size={30}>
            <DropIcon size={16} />
          </ThemeIcon>
          <Title order={4}>Liquid Measurements</Title>
        </Group>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <FluidUnitField slug="liquid_viewing_unit" onSave={savePreference} />
          <FluidUnitField slug="liquid_entry_unit" onSave={savePreference} />
        </SimpleGrid>
      </Card>

      <Card>
        <Group gap="sm" mb="md">
          <ThemeIcon variant="light" radius="sm" size={30}>
            <ScalesIcon size={16} />
          </ThemeIcon>
          <Title order={4}>Weight Measurements</Title>
        </Group>
        <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="md">
          <WeightUnitField slug="weight_viewing_unit" onSave={savePreference} />
          <WeightUnitField slug="weight_entry_unit" onSave={savePreference} />
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
