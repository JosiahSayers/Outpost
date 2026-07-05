import MealPlan from "$/frontend/trip/meal-plan/meal-plan";
import MobileMealPlan from "$/frontend/trip/meal-plan/mobile-meal-plan";
import { Stack, Title } from "@mantine/core";

export default function MealPlanSection() {
  return (
    <Stack gap="sm">
      <Title order={3}>Meal Plan</Title>

      <MealPlan />

      <MobileMealPlan />
    </Stack>
  );
}
