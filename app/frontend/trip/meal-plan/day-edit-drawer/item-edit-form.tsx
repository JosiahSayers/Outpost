import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import FluidConverter from "$/frontend/shared-components/converter/fluid-converter";
import WeightConverter from "$/frontend/shared-components/converter/weight-converter";
import { MEAL_LABEL, MEAL_ORDER } from "$/frontend/trip/meal-plan/helpers";
import {
  useDeleteMealPlanItem,
  useUpdateMealPlanItem,
} from "$/frontend/utils/api/meal-plan";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import {
  Button,
  Divider,
  Group,
  NumberInput,
  Select,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { TrashIcon } from "@phosphor-icons/react";
import type { MealName } from "../../../../../generated/prisma/enums";

interface Props {
  item: ClientMealPlanItem;
  dayNumber: number;
  tripId: string;
  onDone: () => void;
}

export default function ItemEditForm({
  item,
  dayNumber,
  tripId,
  onDone,
}: Props) {
  const [confirmOpened, confirm] = useDisclosure(false);
  const updateItem = useUpdateMealPlanItem(tripId);
  const deleteItem = useDeleteMealPlanItem(tripId);

  // NumberInputs hold "" when empty; empty maps to "not tracked" on submit
  // (0 for calories, null for the nullable fields).
  const form = useForm({
    initialValues: {
      name: item.name,
      brand: item.brand ?? "",
      meal: item.meal as string,
      quantity: item.quantity as number | string,
      calories: (item.calories === 0 ? "" : item.calories) as number | string,
      waterMl: (item.waterMl ?? "") as number | string,
      dryWeightGrams: (item.dryWeightGrams ?? "") as number | string,
    },
    validate: {
      // TODO: follow convention and re-use zod validation from backend
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
    },
  });

  const waterMlInputProps = form.getInputProps("waterMl");
  const dryWeightGramsInputProps = form.getInputProps("dryWeightGrams");

  function buildPayload(values: typeof form.values) {
    return {
      name: values.name.trim(),
      brand: values.brand.trim() || null,
      meal: values.meal as MealName,
      quantity: typeof values.quantity === "number" ? values.quantity : 1,
      calories: typeof values.calories === "number" ? values.calories : 0,
      // waterMl is an Int on the backend; the display unit (e.g. cups) can
      // introduce fractional ml, so round at the submit boundary.
      waterMl:
        typeof values.waterMl === "number" ? Math.round(values.waterMl) : null,
      // dryWeightGrams is an Int on the backend; the display unit (e.g.
      // ounces) can introduce fractional grams, so round at the submit
      // boundary.
      dryWeightGrams:
        typeof values.dryWeightGrams === "number"
          ? Math.round(values.dryWeightGrams)
          : null,
    };
  }

  const handleSubmit = form.onSubmit((values) => {
    updateItem.mutate({ dayNumber, itemId: item.id, ...buildPayload(values) });
    onDone();
  });

  // Ripples by default (handleSubmit above); this forks instead -- creates a
  // new item with these field values and re-points only this placement to
  // it, leaving every other day/trip using the original item untouched.
  function handleSaveAsNew() {
    const validation = form.validate();
    if (validation.hasErrors) return;
    updateItem.mutate({
      dayNumber,
      itemId: item.id,
      ...buildPayload(form.values),
      fork: true,
    });
    onDone();
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <TextInput
          label="Name"
          required
          {...form.getInputProps("name")}
          mb="sm"
        />

        <TextInput label="Brand" {...form.getInputProps("brand")} mb="sm" />

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

        <FluidConverter
          label="Water"
          mb="sm"
          {...waterMlInputProps}
          value={waterMlInputProps.value}
        />

        <WeightConverter
          label="Dry weight"
          mb="lg"
          {...dryWeightGramsInputProps}
          value={dryWeightGramsInputProps.value}
        />

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
          <Group gap="xs">
            <Button type="button" variant="light" onClick={handleSaveAsNew}>
              Save as new item
            </Button>
            <Button type="submit">Save</Button>
          </Group>
        </Group>

        <Text size="xs" c="dimmed" mt="sm">
          This item may be used on other days or trips. <strong>Save</strong>{" "}
          updates it everywhere it appears; <strong>Save as new item</strong>{" "}
          changes only this one, without affecting the others.
        </Text>
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
