import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import {
  MEAL_LABEL,
  MEAL_ORDER,
  dayCalories,
  formatCalories,
  formatMealDate,
  itemCaloriesSummary,
  mealCalories,
} from "$/frontend/trip/meal-plan/helpers";
import {
  useCreateMealPlanItem,
  useDeleteMealPlanItem,
  useUpdateMealPlanItem,
} from "$/frontend/utils/api/meal-plan";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import {
  ActionIcon,
  Button,
  Divider,
  Drawer,
  Group,
  NumberInput,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import {
  ArrowLeftIcon,
  CaretRightIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import type { MealName } from "../../../../generated/prisma/enums";

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

function ItemRow({
  item,
  onClick,
}: {
  item: ClientMealPlanItem;
  onClick: () => void;
}) {
  const calories = itemCaloriesSummary(item);
  return (
    <UnstyledButton onClick={onClick} px={4} py={2}>
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
          <Text size="sm" truncate>
            {item.name}
          </Text>
          {item.quantity > 1 && (
            <Text size="sm" c="dimmed">
              ×{item.quantity}
            </Text>
          )}
        </Group>
        <Group gap={6} wrap="nowrap">
          {calories && (
            <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
              {calories}
            </Text>
          )}
          <CaretRightIcon size={12} color="var(--mantine-color-dimmed)" />
        </Group>
      </Group>
    </UnstyledButton>
  );
}

function QuickAddInput({
  meal,
  onAdd,
}: {
  meal: MealName;
  onAdd: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <TextInput
      size="xs"
      mt={4}
      value={name}
      aria-label={`Add to ${MEAL_LABEL[meal]}`}
      placeholder={`Add to ${MEAL_LABEL[meal].toLowerCase()}…`}
      leftSection={<PlusIcon size={12} />}
      onChange={(e) => setName(e.currentTarget.value)}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) return;
        onAdd(trimmed);
        setName("");
      }}
    />
  );
}

function ItemEditForm({
  item,
  dayNumber,
  tripId,
  onDone,
}: {
  item: ClientMealPlanItem;
  dayNumber: number;
  tripId: string;
  onDone: () => void;
}) {
  const [confirmOpened, confirm] = useDisclosure(false);
  const updateItem = useUpdateMealPlanItem(tripId);
  const deleteItem = useDeleteMealPlanItem(tripId);

  // NumberInputs hold "" when empty; empty maps to "not tracked" on submit
  // (0 for calories, null for the nullable fields).
  const form = useForm({
    initialValues: {
      name: item.name,
      meal: item.meal as string,
      quantity: item.quantity as number | string,
      calories: (item.calories === 0 ? "" : item.calories) as number | string,
      waterMl: (item.waterMl ?? "") as number | string,
      dryWeightGrams: (item.dryWeightGrams ?? "") as number | string,
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
    },
  });

  const handleSubmit = form.onSubmit((values) => {
    updateItem.mutate({
      dayNumber,
      itemId: item.id,
      name: values.name.trim(),
      meal: values.meal as MealName,
      quantity: typeof values.quantity === "number" ? values.quantity : 1,
      calories: typeof values.calories === "number" ? values.calories : 0,
      waterMl: typeof values.waterMl === "number" ? values.waterMl : null,
      dryWeightGrams:
        typeof values.dryWeightGrams === "number"
          ? values.dryWeightGrams
          : null,
    });
    onDone();
  });

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <TextInput
          label="Name"
          required
          {...form.getInputProps("name")}
          mb="sm"
        />

        <Select
          label="Meal"
          data={MEAL_ORDER.map((meal) => ({
            value: meal,
            label: MEAL_LABEL[meal],
          }))}
          allowDeselect={false}
          {...form.getInputProps("meal")}
          mb="sm"
        />

        <Group grow mb="sm">
          <NumberInput
            label="Quantity"
            min={1}
            allowDecimal={false}
            {...form.getInputProps("quantity")}
          />
          <NumberInput
            label="Calories"
            min={0}
            allowDecimal={false}
            {...form.getInputProps("calories")}
          />
        </Group>

        <Group grow mb="lg">
          <NumberInput
            label="Water (ml)"
            min={0}
            allowDecimal={false}
            {...form.getInputProps("waterMl")}
          />
          <NumberInput
            label="Dry weight (g)"
            min={0}
            allowDecimal={false}
            {...form.getInputProps("dryWeightGrams")}
          />
        </Group>

        <Divider mb="md" />

        <Group justify="space-between">
          <Button
            color="red"
            variant="subtle"
            leftSection={<TrashIcon size={14} />}
            onClick={confirm.open}
          >
            Remove item
          </Button>
          <Button type="submit">Save</Button>
        </Group>
      </form>

      <ConfirmDeleteModal
        opened={confirmOpened}
        onClose={confirm.close}
        onConfirm={() => {
          deleteItem.mutate({ dayNumber, itemId: item.id });
          onDone();
        }}
        title="Remove item?"
        confirmLabel="Remove"
      >
        Remove <strong>{item.name}</strong> from this day? This can&apos;t be
        undone.
      </ConfirmDeleteModal>
    </>
  );
}
