import MealPlan from "$/frontend/trip/meal-plan/meal-plan";
import MobileMealPlan from "$/frontend/trip/meal-plan/mobile-meal-plan";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import { Stack, Text, Title } from "@mantine/core";

export default function MealPlanSection({
  mealPlan,
}: {
  mealPlan: ClientMealPlanDay[];
}) {
  return (
    <Stack gap="sm">
      <Title order={3}>Meal Plan</Title>

      {mealPlan.length === 0 ? (
        <Text size="sm" c="dimmed">
          No meals planned yet.
        </Text>
      ) : (
        <>
          <MealPlan mealPlan={mealPlan} />

          <MobileMealPlan mealPlan={mealPlan} />
        </>
      )}
    </Stack>
  );
}
