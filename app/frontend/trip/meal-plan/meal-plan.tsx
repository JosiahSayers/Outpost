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
import { Box, Group, Stack, Table, Text } from "@mantine/core";
import { DropIcon } from "@phosphor-icons/react";

export default function MealPlan({
  mealPlan,
  onDayClick,
}: {
  mealPlan: ClientMealPlanDay[];
  onDayClick: (day: ClientMealPlanDay) => void;
}) {
  const formatWeight = useWeightDisplay({ rollUp: true });
  const formatWater = useFluidDisplay();

  return (
    <Box visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Day</Table.Th>
            {MEAL_ORDER.map((meal) => (
              <Table.Th key={meal}>{MEAL_LABEL[meal]}</Table.Th>
            ))}
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {mealPlan.map((day) => {
            const hasItems = MEAL_ORDER.some(
              (meal) => day.meals[meal].length > 0,
            );
            return (
              <Table.Tr
                key={day.id}
                onClick={() => onDayClick(day)}
                style={{ cursor: "pointer" }}
              >
                <Table.Td style={{ verticalAlign: "top" }}>
                  <Text fw={600} size="sm">
                    Day {day.dayNumber}
                  </Text>
                  {day.date && (
                    <Text size="xs" c="dimmed">
                      {formatMealDate(day.date)}
                    </Text>
                  )}
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
                </Table.Td>
                {MEAL_ORDER.map((meal) => {
                  const waterMl = mealWaterMl(day.meals[meal]);
                  return (
                    <Table.Td key={meal} style={{ verticalAlign: "top" }}>
                      {day.meals[meal].length === 0 ? (
                        "—"
                      ) : (
                        <Stack gap={2}>
                          {day.meals[meal].map((item) => (
                            <Group gap={6} wrap="nowrap" key={item.id}>
                              <Text size="sm">{item.name}</Text>
                              {item.quantity > 1 && (
                                <Text size="sm" c="dimmed">
                                  ×{item.quantity}
                                </Text>
                              )}
                            </Group>
                          ))}
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
                        </Stack>
                      )}
                    </Table.Td>
                  );
                })}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
        <Table.Tfoot>
          <Table.Tr style={{ borderBottom: "none" }}>
            <Table.Td
              colSpan={MEAL_ORDER.length + 1}
              style={{
                borderTop: "2px solid var(--mantine-color-stone-gray-3)",
              }}
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
            </Table.Td>
          </Table.Tr>
        </Table.Tfoot>
      </Table>
    </Box>
  );
}
