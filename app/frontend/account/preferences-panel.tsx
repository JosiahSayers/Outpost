import {
  FLUID_CONVERSIONS,
  FLUID_DEFAULT_UNIT,
  type FluidUnit,
} from "$/frontend/shared-components/converter/fluid-conversions";
import {
  WEIGHT_CONVERSIONS,
  WEIGHT_DEFAULT_UNIT,
  type WeightUnit,
} from "$/frontend/shared-components/converter/weight-conversions";
import {
  useAccountSettings,
  useUpdateAccountSetting,
} from "$/frontend/utils/api/account-settings";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import {
  Card,
  Center,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DropIcon, ScalesIcon } from "@phosphor-icons/react";

type FluidSettingSlug = "liquid_viewing_unit" | "liquid_entry_unit";
type WeightSettingSlug = "weight_viewing_unit" | "weight_entry_unit";

function settingFor(
  settings: ClientUserAccountSetting[] | undefined,
  slug: string,
) {
  return settings?.find((setting) => setting.slug === slug);
}

interface FluidUnitFieldProps {
  slug: FluidSettingSlug;
  setting: ClientUserAccountSetting | undefined;
  onSave: (slug: FluidSettingSlug, value: FluidUnit) => void;
}

function FluidUnitField({ slug, setting, onSave }: FluidUnitFieldProps) {
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
      onChange={(next) => next && onSave(slug, next as FluidUnit)}
      allowDeselect={false}
    />
  );
}

interface WeightUnitFieldProps {
  slug: WeightSettingSlug;
  setting: ClientUserAccountSetting | undefined;
  onSave: (slug: WeightSettingSlug, value: WeightUnit) => void;
}

function WeightUnitField({ slug, setting, onSave }: WeightUnitFieldProps) {
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
      onChange={(next) => next && onSave(slug, next as WeightUnit)}
      allowDeselect={false}
    />
  );
}

export default function PreferencesPanel() {
  const { data: settings, isPending } = useAccountSettings();
  const updateSetting = useUpdateAccountSetting();

  const saveFluid = (slug: FluidSettingSlug, value: FluidUnit) => {
    updateSetting.mutate(
      { slug, value },
      { onError: notifyError("Couldn't update preference") },
    );
  };

  const saveWeight = (slug: WeightSettingSlug, value: WeightUnit) => {
    updateSetting.mutate(
      { slug, value },
      { onError: notifyError("Couldn't update preference") },
    );
  };

  if (isPending) {
    return (
      <Center mih={200}>
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
          <FluidUnitField
            slug="liquid_viewing_unit"
            setting={settingFor(settings, "liquid_viewing_unit")}
            onSave={saveFluid}
          />
          <FluidUnitField
            slug="liquid_entry_unit"
            setting={settingFor(settings, "liquid_entry_unit")}
            onSave={saveFluid}
          />
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
          <WeightUnitField
            slug="weight_viewing_unit"
            setting={settingFor(settings, "weight_viewing_unit")}
            onSave={saveWeight}
          />
          <WeightUnitField
            slug="weight_entry_unit"
            setting={settingFor(settings, "weight_entry_unit")}
            onSave={saveWeight}
          />
        </SimpleGrid>
      </Card>
    </Stack>
  );
}
