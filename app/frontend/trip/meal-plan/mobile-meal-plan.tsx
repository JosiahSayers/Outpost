import {
  MEAL_LABEL,
  MEAL_ORDER,
  dayCalories,
  formatCalories,
  formatMealDate,
  mealCalories,
} from "$/frontend/trip/meal-plan/helpers";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { CaretRightIcon } from "@phosphor-icons/react";

export default function MobileMealPlan({
  mealPlan,
  onDayClick,
}: {
  mealPlan: ClientMealPlanDay[];
  onDayClick: (day: ClientMealPlanDay) => void;
}) {
  return (
    <Stack gap="xs" hiddenFrom="sm">
      {mealPlan.map((day) => {
        const hasItems = MEAL_ORDER.some((meal) => day.meals[meal].length > 0);
        return (
          <Paper
            withBorder
            p="sm"
            key={day.id}
            onClick={() => onDayClick(day)}
            style={{ cursor: "pointer" }}
          >
            <Group justify="space-between" mb={8}>
              <Group gap={6} align="baseline">
                <Text fw={600} size="sm">
                  Day {day.dayNumber}
                </Text>
                {day.date && (
                  <Text size="xs" c="dimmed">
                    {formatMealDate(day.date)}
                  </Text>
                )}
              </Group>
              <Group gap={6}>
                {hasItems && (
                  <Text size="xs" c="dimmed">
                    {formatCalories(dayCalories(day))}
                  </Text>
                )}
                <CaretRightIcon size={12} color="var(--mantine-color-dimmed)" />
              </Group>
            </Group>

            <Stack gap="sm">
              {MEAL_ORDER.map((meal) => (
                <Stack gap={2} key={meal}>
                  <Group justify="space-between" align="baseline">
                    <Text size="sm" fw={600}>
                      {MEAL_LABEL[meal]}
                    </Text>
                    {day.meals[meal].length > 0 && (
                      <Text size="xs" c="dimmed">
                        {formatCalories(mealCalories(day.meals[meal]))}
                      </Text>
                    )}
                  </Group>
                  {day.meals[meal].length === 0 ? (
                    <Text size="sm" c="dimmed" pl="xs">
                      Nothing planned.
                    </Text>
                  ) : (
                    day.meals[meal].map((item) => (
                      <Group gap={6} pl="xs" key={item.id}>
                        <Text size="sm">{item.name}</Text>
                        {item.quantity > 1 && (
                          <Text size="sm" c="dimmed">
                            ×{item.quantity}
                          </Text>
                        )}
                      </Group>
                    ))
                  )}
                </Stack>
              ))}
            </Stack>
          </Paper>
        );
      })}
    </Stack>
  );
}
