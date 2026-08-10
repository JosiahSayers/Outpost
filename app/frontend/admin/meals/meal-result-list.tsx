import MealThumb from "$/frontend/admin/meals/meal-thumb";
import type { ClientAdminPublicMealItem } from "$/transformers/admin/public-meal-item";
import { Box, Group, Stack, Text } from "@mantine/core";

interface MealResultListProps {
  items: ClientAdminPublicMealItem[];
  selectedId: string | null;
  onSelect: (item: ClientAdminPublicMealItem) => void;
}

export default function MealResultList({
  items,
  selectedId,
  onSelect,
}: MealResultListProps) {
  return (
    <Stack gap={2}>
      {items.map((item) => {
        const isActive = item.id === selectedId;

        return (
          <Group
            key={item.id}
            gap="sm"
            wrap="nowrap"
            onClick={() => onSelect(item)}
            p={6}
            style={{
              borderRadius: 7,
              cursor: "pointer",
              background: isActive
                ? "var(--mantine-color-trail-green-0)"
                : undefined,
            }}
          >
            <MealThumb item={item} size={38} />
            <Box style={{ minWidth: 0, flex: 1 }}>
              <Text size="sm" fw={600} truncate>
                {item.name}
              </Text>
              <Text size="xs" c="dimmed" truncate>
                {item.brand ?? "—"}
              </Text>
            </Box>
            {item.calories != null && (
              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                {item.calories} cal
              </Text>
            )}
          </Group>
        );
      })}
    </Stack>
  );
}
