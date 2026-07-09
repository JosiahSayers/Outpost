import ItemEditForm from "$/frontend/trip/meal-plan/day-edit-drawer/item-edit-form";
import ItemRow from "$/frontend/trip/meal-plan/day-edit-drawer/item-row";
import QuickAddInput from "$/frontend/trip/meal-plan/day-edit-drawer/quick-add-input";
import {
  MEAL_LABEL,
  MEAL_ORDER,
  dayCalories,
  formatCalories,
  formatMealDate,
  mealCalories,
} from "$/frontend/trip/meal-plan/helpers";
import { useCreateMealPlanItem } from "$/frontend/utils/api/meal-plan";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import { ActionIcon, Drawer, Group, Stack, Text } from "@mantine/core";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

interface Props {
  day: ClientMealPlanDay | null;
  tripId: string;
  opened: boolean;
  onClose: () => void;
}

type View = { mode: "list" } | { mode: "edit"; itemId: string };

export default function DayEditDrawer({ day, tripId, opened, onClose }: Props) {
  const [view, setView] = useState<View>({ mode: "list" });
  const createItem = useCreateMealPlanItem(tripId);

  // The drawer stays mounted (so its close transition can play), so the view
  // has to be reset explicitly each time it opens.
  useEffect(() => {
    if (opened) setView({ mode: "list" });
  }, [opened]);

  // The edited item is looked up fresh from the day prop each render; if it
  // disappears from the cache (e.g. the update settles), fall back to the
  // list view instead of rendering a stale form.
  const editingItem =
    day && view.mode === "edit"
      ? MEAL_ORDER.flatMap((meal) => day.meals[meal]).find(
          (item) => item.id === view.itemId,
        )
      : undefined;

  const hasItems =
    day !== null && MEAL_ORDER.some((meal) => day.meals[meal].length > 0);

  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size="md"
      title={
        day &&
        (editingItem ? (
          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              color="gray"
              aria-label="Back to day"
              onClick={() => setView({ mode: "list" })}
            >
              <ArrowLeftIcon size={16} />
            </ActionIcon>
            <Text fw={600}>Edit item</Text>
          </Group>
        ) : (
          <Group gap="xs" align="baseline">
            <Text fw={600}>Day {day.dayNumber}</Text>
            {day.date && (
              <Text size="sm" c="dimmed">
                {formatMealDate(day.date)}
              </Text>
            )}
            {hasItems && (
              <Text size="sm" c="dimmed">
                · {formatCalories(dayCalories(day))}
              </Text>
            )}
          </Group>
        ))
      }
    >
      {day &&
        (editingItem ? (
          <ItemEditForm
            key={editingItem.id}
            item={editingItem}
            dayNumber={day.dayNumber}
            tripId={tripId}
            onDone={() => setView({ mode: "list" })}
          />
        ) : (
          <Stack gap="lg">
            {MEAL_ORDER.map((meal) => (
              <Stack gap={4} key={meal}>
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

                {day.meals[meal].map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onClick={() => setView({ mode: "edit", itemId: item.id })}
                  />
                ))}

                <QuickAddInput
                  meal={meal}
                  onAdd={(name) =>
                    createItem.mutate({ dayNumber: day.dayNumber, name, meal })
                  }
                />
              </Stack>
            ))}
          </Stack>
        ))}
    </Drawer>
  );
}
