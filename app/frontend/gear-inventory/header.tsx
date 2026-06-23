import StatBar from "$/frontend/gear-inventory/stat-bar";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";

interface Props {
  onAdd: () => void;
  items: Array<ClientGearInventoryItem>;
}

export default function Header({ items, onAdd }: Props) {
  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-start">
        <div>
          <Title order={1}>Gear Inventory</Title>
          <Text c="dimmed">Track and manage everything in your kit.</Text>
        </div>
        <Button leftSection={<PlusIcon size={16} />} onClick={onAdd}>
          Add Item
        </Button>
      </Group>
      <StatBar items={items} />
    </Stack>
  );
}
