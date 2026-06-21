import AppLink from "$/frontend/app-link";
import type { GearSummary } from "$/frontend/dashboard/types";
import { Group, Paper, Text } from "@mantine/core";
import { Backpack, Scales, Tag } from "@phosphor-icons/react";

interface Props {
  summary: GearSummary;
}

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
    <Group gap="sm">
      {icon}
      <div>
        <Text size="xs" c="dimmed" tt="uppercase" fw={600} lh={1.2}>
          {label}
        </Text>
        <Text fw={700} size="lg" lh={1.2}>
          {value}
        </Text>
      </div>
    </Group>
  );
}

export default function GearSummaryBar({ summary }: Props) {
  return (
    <Paper p="lg" withBorder>
      <Group justify="space-between" align="center" wrap="wrap" gap="md">
        <Group gap="xl" wrap="wrap">
          <Stat
            icon={<Backpack size={22} />}
            label="Gear Items"
            value={summary.totalItems}
          />
          <Stat
            icon={<Scales size={22} />}
            label="Total Weight"
            value={`${summary.totalWeightKg} kg`}
          />
          <Stat
            icon={<Tag size={22} />}
            label="Categories"
            value={summary.categoryCount}
          />
        </Group>
        <AppLink href="/gear">Manage Gear Inventory →</AppLink>
      </Group>
    </Paper>
  );
}
