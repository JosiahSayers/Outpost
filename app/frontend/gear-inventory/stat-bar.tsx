import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import { Group, Text } from "@mantine/core";
import { BackpackIcon, ScalesIcon, TagIcon } from "@phosphor-icons/react";

interface Props {
  items: Array<ClientGearInventoryItem>;
}

export default function StatBar({ items }: Props) {
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalWeightKg = (
    items.reduce((sum, i) => sum + (i.grams ?? 0) * i.quantity, 0) / 1000
  ).toFixed(2);
  const categories = new Set(items.map((i) => i.category.name)).size;

  return (
    <Group gap="xl" wrap="wrap">
      <Group gap="xs">
        <BackpackIcon size={18} color="var(--mantine-color-trail-green-6)" />
        <div>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed" lh={1.2}>
            Items
          </Text>
          <Text fw={700} lh={1.2}>
            {totalItems} ({items.length} unique)
          </Text>
        </div>
      </Group>
      <Group gap="xs">
        <ScalesIcon size={18} color="var(--mantine-color-trail-green-6)" />
        <div>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed" lh={1.2}>
            Weight
          </Text>
          <Text fw={700} lh={1.2}>
            {totalWeightKg} kg
          </Text>
        </div>
      </Group>
      <Group gap="xs">
        <TagIcon size={18} color="var(--mantine-color-trail-green-6)" />
        <div>
          <Text size="xs" tt="uppercase" fw={600} c="dimmed" lh={1.2}>
            Categories
          </Text>
          <Text fw={700} lh={1.2}>
            {categories}
          </Text>
        </div>
      </Group>
    </Group>
  );
}
