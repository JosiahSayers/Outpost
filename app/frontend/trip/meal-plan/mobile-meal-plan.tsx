import {
  MEAL_LABEL,
  MEAL_ORDER,
  dayCalories,
  dayWeightGrams,
  formatCalories,
  formatMealDate,
  mealWaterMl,
  tripCalories,
  tripWeightGrams,
} from "$/frontend/trip/meal-plan/helpers";
import { useFluidDisplay } from "$/frontend/utils/hooks/unit-conversion/use-fluid-display";
import { useWeightDisplay } from "$/frontend/utils/hooks/unit-conversion/use-weight-display";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import { Group, Paper, Stack, Text } from "@mantine/core";
import { CaretRightIcon, DropIcon } from "@phosphor-icons/react";

export default function MobileMealPlan({
  mealPlan,
  onDayClick,
}: {
  mealPlan: ClientMealPlanDay[];
  onDayClick: (day: ClientMealPlanDay) => void;
}) {
  const formatWeight = useWeightDisplay({ rollUp: true });
  const formatWater = useFluidDisplay();

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
                  <Group gap={4} wrap="nowrap">
                    <Text size="xs" c="dimmed">
                      {formatCalories(dayCalories(day))}
                    </Text>
                    <Text size="xs" c="bark-brown.6" fw={600}>
                      {formatWeight(dayWeightGrams(day))}
                    </Text>
                  </Group>
                )}
                <CaretRightIcon size={12} color="var(--mantine-color-dimmed)" />
              </Group>
            </Group>

            <Stack gap="sm">
              {MEAL_ORDER.map((meal) => {
                const waterMl = mealWaterMl(day.meals[meal]);
                return (
                  <Stack gap={2} key={meal}>
                    <Group justify="space-between" align="baseline">
                      <Text size="sm" fw={600}>
                        {MEAL_LABEL[meal]}
                      </Text>
                      {waterMl > 0 && (
                        <Group gap={2} wrap="nowrap">
                          <DropIcon
                            size={11}
                            weight="fill"
                            color="var(--mantine-color-trail-green-7)"
                          />
                          <Text size="xs" c="trail-green.7" fw={600}>
                            {formatWater(waterMl)}
                          </Text>
                        </Group>
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
                );
              })}
            </Stack>
          </Paper>
        );
      })}

      <Paper
        withBorder
        p="sm"
        bg="trail-green.0"
        style={{ borderColor: "var(--mantine-color-trail-green-2)" }}
      >
        <Group justify="space-between">
          <Text size="xs" tt="uppercase" fw={600} c="dimmed">
            Trip total
          </Text>
          <Group gap={6}>
            <Text size="sm" fw={700}>
              {formatCalories(tripCalories(mealPlan))}
            </Text>
            <Text size="sm" c="bark-brown.6" fw={700}>
              {formatWeight(tripWeightGrams(mealPlan))}
            </Text>
          </Group>
        </Group>
      </Paper>
    </Stack>
  );
}
