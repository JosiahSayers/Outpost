import { nextMealPlanDay } from "$/frontend/trip/meal-plan/helpers";
import MealPlan from "$/frontend/trip/meal-plan/meal-plan";
import MobileMealPlan from "$/frontend/trip/meal-plan/mobile-meal-plan";
import { useCreateMealPlanDay } from "$/frontend/utils/api/meal-plan";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { PlusIcon } from "@phosphor-icons/react";

export default function MealPlanSection({
  tripId,
  mealPlan,
  tripStart,
}: {
  tripId: string;
  mealPlan: ClientMealPlanDay[];
  tripStart: string | null;
}) {
  const createDay = useCreateMealPlanDay(tripId);

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="baseline">
        <Title order={3}>Meal Plan</Title>
        <Button
          size="xs"
          variant="default"
          leftSection={<PlusIcon size={14} />}
          loading={createDay.isPending}
          onClick={() => createDay.mutate(nextMealPlanDay(mealPlan, tripStart))}
        >
          Add day
        </Button>
      </Group>

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
