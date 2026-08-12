import MealThumb from "$/frontend/admin/meals/meal-thumb";
import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import FluidConverter from "$/frontend/shared-components/converter/fluid-converter";
import WeightConverter from "$/frontend/shared-components/converter/weight-converter";
import {
  useCreateMeal,
  useDeleteMeal,
  useUpdateMeal,
} from "$/frontend/utils/api/admin-meals";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientAdminPublicMealItem } from "$/transformers/admin/public-meal-item";
import { createMeal } from "$/validation/admin/meals";
import {
  Anchor,
  Button,
  Flex,
  Group,
  NumberInput,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useDisclosure } from "@mantine/hooks";
import { TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { z } from "zod";

interface MealDetailPanelProps {
  // null means "create a new meal" -- the form starts blank.
  meal: ClientAdminPublicMealItem | null;
  onCreated: (meal: ClientAdminPublicMealItem) => void;
  onUpdated: (meal: ClientAdminPublicMealItem) => void;
  onDeleted: () => void;
  onCancel: () => void;
}

// NumberInput holds "" (not undefined) when cleared, and createMeal's
// optional int/url fields don't accept that -- treat "" as unset before
// handing off to the real field schema, so validation stays driven by the
// backend's own rules instead of a hand-rolled duplicate of them.
function optionalWhenBlank<Schema extends z.ZodTypeAny>(schema: Schema) {
  return z.preprocess((value) => (value === "" ? undefined : value), schema);
}

const mealFormSchema = createMeal.extend({
  calories: optionalWhenBlank(createMeal.shape.calories),
  waterMl: optionalWhenBlank(createMeal.shape.waterMl),
  dryWeightGrams: optionalWhenBlank(createMeal.shape.dryWeightGrams),
  sourceImageUrl: optionalWhenBlank(createMeal.shape.sourceImageUrl),
});

type FormValues = {
  name: string;
  brand: string;
  calories: number | string;
  waterMl: number | string;
  dryWeightGrams: number | string;
  sourceVendor: string;
  sourceProductId: string;
  sourceUrl: string;
  sourceImageUrl: string;
};

function buildPayload(values: FormValues): z.input<typeof createMeal> {
  return {
    name: values.name.trim(),
    brand: values.brand.trim() || undefined,
    calories: typeof values.calories === "number" ? values.calories : undefined,
    // waterMl/dryWeightGrams are Ints on the backend; the display unit (e.g.
    // cups, ounces) can introduce fractional ml/grams, so round at the
    // submit boundary.
    waterMl:
      typeof values.waterMl === "number"
        ? Math.round(values.waterMl)
        : undefined,
    dryWeightGrams:
      typeof values.dryWeightGrams === "number"
        ? Math.round(values.dryWeightGrams)
        : undefined,
    sourceVendor: values.sourceVendor.trim(),
    sourceProductId: values.sourceProductId.trim(),
    sourceUrl: values.sourceUrl.trim(),
    sourceImageUrl: values.sourceImageUrl.trim() || undefined,
  };
}

export default function MealDetailPanel({
  meal,
  onCreated,
  onUpdated,
  onDeleted,
  onCancel,
}: MealDetailPanelProps) {
  const isEditing = meal !== null;
  const [confirmOpened, confirm] = useDisclosure(false);

  const createMealMutation = useCreateMeal();
  const updateMeal = useUpdateMeal(meal?.id ?? "");
  const deleteMeal = useDeleteMeal();
  const [deleteMealIgnoreOption, setDeleteMealIgnoreOption] = useState(true);
  const isSaving = createMealMutation.isPending || updateMeal.isPending;

  const form = useForm<FormValues>({
    initialValues: {
      name: meal?.name ?? "",
      brand: meal?.brand ?? "",
      calories: meal?.calories ?? "",
      waterMl: meal?.waterMl ?? "",
      dryWeightGrams: meal?.dryWeightGrams ?? "",
      sourceVendor: meal?.sourceVendor ?? "",
      sourceProductId: meal?.sourceProductId ?? "",
      sourceUrl: meal?.sourceUrl ?? "",
      // The override (if an admin has set one) is what's actually in effect
      // -- prefill with that rather than the vendor's tracked source url so
      // the field reflects what the admin will see re-processed on save.
      sourceImageUrl: meal?.overrideImageUrl ?? meal?.sourceImageUrl ?? "",
    },
    validate: schemaResolver(mealFormSchema, { sync: true }),
  });

  const waterMlInputProps = form.getInputProps("waterMl");
  const dryWeightGramsInputProps = form.getInputProps("dryWeightGrams");

  const handleSubmit = form.onSubmit((values) => {
    const payload = buildPayload(values);

    if (isEditing) {
      updateMeal.mutate(payload, {
        onSuccess: onUpdated,
        onError: notifyError("Couldn't save changes"),
      });
    } else {
      createMealMutation.mutate(payload, {
        onSuccess: onCreated,
        onError: notifyError("Couldn't create meal"),
      });
    }
  });

  // Always Outpost's own R2-cached copy, never the raw sourceImageUrl field
  // -- that's the image processing job's whole point, and it shouldn't
  // flicker to an unprocessed source image while the admin is just typing.
  // It only changes once a save round-trips through the backend.
  const previewItem = {
    id: meal?.id ?? "new",
    name: form.values.name || "New meal",
    imageUrl: meal?.imageUrl ?? null,
  };

  return (
    <>
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="lg">
          <Flex
            gap="md"
            align="flex-start"
            direction={{ base: "column-reverse", xs: "row" }}
          >
            <MealThumb item={previewItem} size={164} radius={10} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <Title order={4} lineClamp={2}>
                {isEditing ? meal.name : "New meal"}
              </Title>
              {isEditing && meal.brand && (
                <Text size="sm" c="dimmed">
                  {meal.brand}
                </Text>
              )}
            </div>
            {isEditing && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<TrashIcon size={14} />}
                onClick={confirm.open}
              >
                Delete
              </Button>
            )}
          </Flex>

          <Group grow>
            <TextInput label="Name" required {...form.getInputProps("name")} />
            <TextInput label="Brand" {...form.getInputProps("brand")} />
          </Group>

          <NumberInput
            label="Calories"
            min={0}
            allowDecimal={false}
            {...form.getInputProps("calories")}
          />

          <FluidConverter
            label="Water"
            {...waterMlInputProps}
            value={waterMlInputProps.value}
          />

          <WeightConverter
            label="Dry weight"
            {...dryWeightGramsInputProps}
            value={dryWeightGramsInputProps.value}
          />

          <Group grow>
            <TextInput
              label="Source vendor"
              required
              {...form.getInputProps("sourceVendor")}
            />
            <TextInput
              label="Source product id"
              required
              {...form.getInputProps("sourceProductId")}
            />
          </Group>

          <Stack gap="xs">
            <TextInput
              label="Source URL"
              description="Product page link, shown to admins for cross-reference"
              required
              {...form.getInputProps("sourceUrl")}
            />
            <Anchor
              href={form.getInputProps("sourceUrl").value}
              target="_blank"
            >
              {form.getInputProps("sourceUrl").value}
            </Anchor>
          </Stack>

          <TextInput
            label="Source image URL"
            description="Changing this re-fetches and reprocesses the product image. The override sticks until the vendor's own photo changes."
            {...form.getInputProps("sourceImageUrl")}
          />

          <Group justify="flex-end">
            <Button type="button" variant="subtle" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" loading={isSaving}>
              {isEditing ? "Save changes" : "Add meal"}
            </Button>
          </Group>
        </Stack>
      </form>

      {isEditing && (
        <ConfirmDeleteModal
          opened={confirmOpened}
          onClose={confirm.close}
          onConfirm={() => {
            deleteMeal.mutate(
              {
                id: meal.id,
                ignore: deleteMealIgnoreOption ? "true" : "false",
              },
              {
                onSuccess: onDeleted,
                onError: notifyError("Couldn't delete meal"),
              },
            );
          }}
          title="Delete this meal?"
          confirmLabel="Delete"
        >
          <>
            Delete <strong>{meal.name}</strong> from the public catalog? This
            can&rsquo;t be undone. Trips that already added this item keep their
            own copy, unaffected.
          </>

          <Switch
            checked={deleteMealIgnoreOption}
            onChange={(e) => setDeleteMealIgnoreOption(e.currentTarget.checked)}
            label="Ignore this meal during future imports?"
            mt="md"
          />
        </ConfirmDeleteModal>
      )}
    </>
  );
}
