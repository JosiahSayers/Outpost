import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import DayDateEditor from "$/frontend/trip/meal-plan/day-edit-drawer/day-date-editor";
import ItemEditForm from "$/frontend/trip/meal-plan/day-edit-drawer/item-edit-form";
import ItemRow from "$/frontend/trip/meal-plan/day-edit-drawer/item-row";
import QuickAddInput from "$/frontend/trip/meal-plan/day-edit-drawer/quick-add-input";
import {
  MEAL_LABEL,
  MEAL_ORDER,
  dayCalories,
  formatCalories,
  mealCalories,
} from "$/frontend/trip/meal-plan/helpers";
import {
  useCreateMealPlanItem,
  useDeleteMealPlanDay,
  useUpdateMealPlanDay,
} from "$/frontend/utils/api/meal-plan";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import {
  ActionIcon,
  Button,
  Divider,
  Drawer,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { ArrowLeftIcon, TrashIcon } from "@phosphor-icons/react";
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
  const [confirmOpened, confirm] = useDisclosure(false);
  const createItem = useCreateMealPlanItem(tripId);
  const updateDay = useUpdateMealPlanDay(tripId);
  const deleteDay = useDeleteMealPlanDay(tripId);

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
    <>
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
              <DayDateEditor
                date={day.date}
                onChange={(date) =>
                  updateDay.mutate(
                    { dayNumber: day.dayNumber, date },
                    { onError: notifyError("Couldn't update the day's date") },
                  )
                }
              />
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
                    tripId={tripId}
                    onAdd={(name) =>
                      createItem.mutate({
                        mode: "new",
                        dayNumber: day.dayNumber,
                        name,
                        meal,
                      })
                    }
                    onSelectExisting={(item) =>
                      createItem.mutate({
                        mode: "existing",
                        dayNumber: day.dayNumber,
                        meal,
                        mealPlanItemId: item.id,
                        quantity: 1,
                      })
                    }
                  />
                </Stack>
              ))}

              <Divider />

              <Button
                color="red"
                variant="subtle"
                leftSection={<TrashIcon size={14} />}
                loading={deleteDay.isPending}
                onClick={confirm.open}
              >
                Remove day
              </Button>
            </Stack>
          ))}
      </Drawer>

      {day && (
        <ConfirmDeleteModal
          opened={confirmOpened}
          onClose={confirm.close}
          onConfirm={() => {
            deleteDay.mutate(day.dayNumber, {
              onError: notifyError("Couldn't remove day"),
            });
            onClose();
          }}
          title="Remove day?"
          confirmLabel="Remove"
        >
          Remove <strong>Day {day.dayNumber}</strong> and all of its meals? This
          can&apos;t be undone.
        </ConfirmDeleteModal>
      )}
    </>
  );
}
