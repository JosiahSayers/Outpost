import AppLink from "$/frontend/app-link";
import GearStatsGroup from "$/frontend/gear-inventory/gear-stats-group";
import { useGearInventory } from "$/frontend/utils/api/gear-inventory";
import { Group, Paper, Skeleton } from "@mantine/core";

export default function GearSummaryBar() {
  const gearInventory = useGearInventory();

  return (
    <Skeleton visible={gearInventory.isPending}>
      <Paper p="lg" withBorder>
        <Group justify="space-between" align="center" wrap="wrap" gap="md">
          <GearStatsGroup items={gearInventory.data?.items ?? []} />
          <AppLink href="/gear-inventory">Manage Gear Inventory →</AppLink>
        </Group>
      </Paper>
    </Skeleton>
  );
}
