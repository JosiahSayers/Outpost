import { placeholderMealPlan } from "$/frontend/trip/placeholder-data";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { ForkKnifeIcon } from "@phosphor-icons/react";

export default function MobileMealPlan() {
  return (
    <Stack gap="xs" hiddenFrom="sm">
      {placeholderMealPlan.map((meal) => (
        <Paper withBorder p="sm" key={meal.day}>
          <Group justify="space-between" mb={6}>
            <Text fw={600} size="sm">
              {meal.day}
            </Text>
            <Text size="xs" c="dimmed">
              {meal.date}
            </Text>
          </Group>
          <Stack gap={2}>
            {meal.breakfast && (
              <Group gap={6}>
                <ForkKnifeIcon size={13} />
                <Text size="sm" c="dimmed">
                  Breakfast — {meal.breakfast}
                </Text>
              </Group>
            )}
            {meal.lunch && (
              <Group gap={6}>
                <ForkKnifeIcon size={13} />
                <Text size="sm" c="dimmed">
                  Lunch — {meal.lunch}
                </Text>
              </Group>
            )}
            {meal.dinner && (
              <Group gap={6}>
                <ForkKnifeIcon size={13} />
                <Text size="sm" c="dimmed">
                  Dinner — {meal.dinner}
                </Text>
              </Group>
            )}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
