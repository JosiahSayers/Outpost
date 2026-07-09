import {
  MEAL_LABEL,
  MEAL_ORDER,
  formatMealDate,
  mealItemsSummary,
} from "$/frontend/trip/meal-plan/helpers";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import { Box, Table, Text } from "@mantine/core";

export default function MealPlan({
  mealPlan,
}: {
  mealPlan: ClientMealPlanDay[];
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
          {mealPlan.map((day) => (
            <Table.Tr key={day.id}>
              <Table.Td>
                <Text fw={600} size="sm">
                  Day {day.dayNumber}
                </Text>
                {day.date && (
                  <Text size="xs" c="dimmed">
                    {formatMealDate(day.date)}
                  </Text>
                )}
              </Table.Td>
              {MEAL_ORDER.map((meal) => (
                <Table.Td key={meal}>
                  {mealItemsSummary(day.meals[meal]) ?? "—"}
                </Table.Td>
              ))}
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
