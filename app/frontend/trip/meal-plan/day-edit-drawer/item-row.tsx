import { itemCaloriesSummary } from "$/frontend/trip/meal-plan/helpers";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import { Group, Text, UnstyledButton } from "@mantine/core";
import { CaretRightIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";

interface Props {
  item: ClientMealPlanItem;
  onClick: () => void;
}

export default function ItemRow({ item, onClick }: Props) {
  const calories = itemCaloriesSummary(item);

  // Briefly highlights the quantity when it changes -- covers both a bump
  // from re-adding an already-placed item and a manual quantity edit.
  const [highlighted, setHighlighted] = useState(false);
  const previousQuantity = useRef(item.quantity);

  useEffect(() => {
    if (previousQuantity.current === item.quantity) return;
    previousQuantity.current = item.quantity;
    setHighlighted(true);
    const timeout = setTimeout(() => setHighlighted(false), 1000);
    return () => clearTimeout(timeout);
  }, [item.quantity]);

  return (
    <UnstyledButton onClick={onClick} px={4} py={2}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Text size="sm" truncate>
            {item.name}
          </Text>
          {item.quantity > 1 && (
            <Text
              size="sm"
              c="dimmed"
              style={{
                borderRadius: 4,
                paddingInline: 4,
                transition: "background-color 600ms ease",
                backgroundColor: highlighted
                  ? "var(--mantine-color-yellow-2)"
                  : "transparent",
              }}
            >
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
