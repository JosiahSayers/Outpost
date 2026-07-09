import {
  MEAL_LABEL,
  MEAL_ORDER,
  formatMealDate,
  mealItemsSummary,
} from "$/frontend/trip/meal-plan/helpers";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { ForkKnifeIcon } from "@phosphor-icons/react";

export default function MobileMealPlan({
  mealPlan,
  onDayClick,
}: {
  mealPlan: ClientMealPlanDay[];
  onDayClick: (day: ClientMealPlanDay) => void;
}) {
  return (
    <Stack gap="xs" hiddenFrom="sm">
      {mealPlan.map((day) => (
        <Paper
          withBorder
          p="sm"
          key={day.id}
          onClick={() => onDayClick(day)}
          style={{ cursor: "pointer" }}
        >
          <Group justify="space-between" mb={6}>
            <Text fw={600} size="sm">
              Day {day.dayNumber}
            </Text>
            {day.date && (
              <Text size="xs" c="dimmed">
                {formatMealDate(day.date)}
              </Text>
            )}
          </Group>
          <Stack gap={2}>
            {MEAL_ORDER.map((meal) => {
              const summary = mealItemsSummary(day.meals[meal]);
              if (!summary) return null;
              return (
                <Group gap={6} key={meal}>
                  <ForkKnifeIcon size={13} />
                  <Text size="sm" c="dimmed">
                    {MEAL_LABEL[meal]} — {summary}
                  </Text>
                </Group>
              );
            })}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
