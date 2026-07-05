import { placeholderMealPlan } from "$/frontend/trip/placeholder-data";
import { Box, Table, Text } from "@mantine/core";

export default function MealPlan() {
  return (
    <Box visibleFrom="sm">
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Day</Table.Th>
            <Table.Th>Breakfast</Table.Th>
            <Table.Th>Lunch</Table.Th>
            <Table.Th>Dinner</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {placeholderMealPlan.map((meal) => (
            <Table.Tr key={meal.day}>
              <Table.Td>
                <Text fw={600} size="sm">
                  {meal.day}
                </Text>
                <Text size="xs" c="dimmed">
                  {meal.date}
                </Text>
              </Table.Td>
              <Table.Td>{meal.breakfast ?? "—"}</Table.Td>
              <Table.Td>{meal.lunch ?? "—"}</Table.Td>
              <Table.Td>{meal.dinner ?? "—"}</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
