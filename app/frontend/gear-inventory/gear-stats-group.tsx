import { buildGearSummary } from "$/frontend/utils/build-gear-summary";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { Group, Text } from "@mantine/core";
import { BackpackIcon, ScalesIcon, TagIcon } from "@phosphor-icons/react";

const ICON_COLOR = "var(--mantine-color-trail-green-6)";
const ICON_SIZE = 18;

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Group gap="xs" align="flex-end">
      {icon}
      <div>
        <Text size="xs" tt="uppercase" fw={600} c="dimmed" lh={1.2}>
          {label}
        </Text>
        <Text fw={700} lh={1}>
          {value}
        </Text>
      </div>
    </Group>
  );
}

export default function GearStatsGroup({
  items,
}: {
  items: ClientGearInventoryItem[];
}) {
  const { totalItems, totalWeightKg, categoryCount } = buildGearSummary(items);
  return (
    <Group gap="xl" wrap="wrap">
      <Stat
        icon={<BackpackIcon size={ICON_SIZE} color={ICON_COLOR} />}
        label="Items"
        value={`${totalItems} (${items.length} unique)`}
      />
      <Stat
        icon={<ScalesIcon size={ICON_SIZE} color={ICON_COLOR} />}
        label="Weight"
        value={`${totalWeightKg} kg`}
      />
      <Stat
        icon={<TagIcon size={ICON_SIZE} color={ICON_COLOR} />}
        label="Categories"
        value={categoryCount}
      />
    </Group>
  );
}
