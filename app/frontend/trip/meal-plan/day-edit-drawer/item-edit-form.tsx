import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import UnitConverterInput from "$/frontend/shared-components/converter/unit-converter-input";
import { useDefaultUnit } from "$/frontend/shared-components/converter/use-default-unit";
import {
  WATER_CONVERSIONS,
  WATER_DEFAULT_UNIT,
  WATER_REGION_DEFAULT_UNIT,
  type WaterUnit,
} from "$/frontend/shared-components/converter/water-conversions";
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
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
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

  const detectedWaterUnit = useDefaultUnit(
    WATER_REGION_DEFAULT_UNIT,
    WATER_DEFAULT_UNIT,
  );
  const [waterUnit, setWaterUnit] = useState<WaterUnit>(detectedWaterUnit);

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
      // TODO: follow convention and re-use zod validation from backend
      name: (value) => (value.trim().length > 0 ? null : "Name is required"),
    },
  });

  const waterMlInputProps = form.getInputProps("waterMl");

  const handleSubmit = form.onSubmit((values) => {
    updateItem.mutate({
      dayNumber,
      itemId: item.id,
      name: values.name.trim(),
      meal: values.meal as MealName,
      quantity: typeof values.quantity === "number" ? values.quantity : 1,
      calories: typeof values.calories === "number" ? values.calories : 0,
      // waterMl is an Int on the backend; the display unit (e.g. cups) can
      // introduce fractional ml, so round at the submit boundary.
      waterMl:
        typeof values.waterMl === "number" ? Math.round(values.waterMl) : null,
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

        <UnitConverterInput
          label="Water"
          min={0}
          decimalScale={2}
          conversions={WATER_CONVERSIONS}
          unit={waterUnit}
          onUnitChange={setWaterUnit}
          mb="sm"
          {...waterMlInputProps}
          value={waterMlInputProps.value}
        />

        <NumberInput
          label="Dry weight (g)"
          min={0}
          allowDecimal={false}
          mb="lg"
          {...form.getInputProps("dryWeightGrams")}
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
