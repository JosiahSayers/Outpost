import { itemCaloriesSummary } from "$/frontend/trip/meal-plan/helpers";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { Group, Text, UnstyledButton } from "@mantine/core";
import { CaretRightIcon } from "@phosphor-icons/react";

interface Props {
  item: ClientMealPlanItem;
  onClick: () => void;
}

export default function ItemRow({ item, onClick }: Props) {
  const calories = itemCaloriesSummary(item);

  return (
    <UnstyledButton onClick={onClick} px={4} py={2}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Text size="sm" truncate>
            {item.name}
          </Text>
          {item.quantity > 1 && (
            <Text size="sm" c="dimmed">
              ×{item.quantity}
            </Text>
          )}
        </Group>
        <Group gap={6} wrap="nowrap">
          {calories && (
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {calories}
            </Text>
          )}
          <CaretRightIcon size={12} color="var(--mantine-color-dimmed)" />
        </Group>
      </Group>
    </UnstyledButton>
  );
}
