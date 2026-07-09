import DayEditDrawer from "$/frontend/trip/meal-plan/day-edit-drawer";
import { nextMealPlanDay } from "$/frontend/trip/meal-plan/helpers";
import MealPlan from "$/frontend/trip/meal-plan/meal-plan";
import MobileMealPlan from "$/frontend/trip/meal-plan/mobile-meal-plan";
import { useCreateMealPlanDay } from "$/frontend/utils/api/meal-plan";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import { Button, Group, Stack, Text, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { PlusIcon } from "@phosphor-icons/react";
import { useState } from "react";

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
  const [drawerOpened, drawer] = useDisclosure(false);
  // Only the id is stored so the drawer always renders the day fresh from
  // the mealPlan prop, picking up any edits made while it's open.
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const selectedDay = mealPlan.find((day) => day.id === selectedDayId) ?? null;

  const openDay = (day: ClientMealPlanDay) => {
    setSelectedDayId(day.id);
    drawer.open();
  };

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
          <MealPlan mealPlan={mealPlan} onDayClick={openDay} />

          <MobileMealPlan mealPlan={mealPlan} onDayClick={openDay} />
        </>
      )}

      <DayEditDrawer
        day={selectedDay}
        tripId={tripId}
        opened={drawerOpened}
        onClose={drawer.close}
      />
    </Stack>
  );
}
