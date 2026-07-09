import {
  MEAL_LABEL,
  MEAL_ORDER,
  dayCalories,
  formatCalories,
  formatMealDate,
  mealCalories,
} from "$/frontend/trip/meal-plan/helpers";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import { Box, Group, Stack, Table, Text } from "@mantine/core";

export default function MealPlan({
  mealPlan,
  onDayClick,
}: {
  mealPlan: ClientMealPlanDay[];
  onDayClick: (day: ClientMealPlanDay) => void;
}) {
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
                    <Text size="xs" c="dimmed">
                      {formatCalories(dayCalories(day))}
                    </Text>
                  )}
                </Table.Td>
                {MEAL_ORDER.map((meal) => (
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
                        <Text size="xs" c="dimmed">
                          {formatCalories(mealCalories(day.meals[meal]))}
                        </Text>
                      </Stack>
                    )}
                  </Table.Td>
                ))}
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
