import { useGearCategorySearch } from "$/frontend/utils/api/gear-categories";
import { useCreateGearInventoryItem } from "$/frontend/utils/api/gear-inventory";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import {
  Button,
  Combobox,
  Drawer,
  Group,
  NumberInput,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { useEffect } from "react";
import { z } from "zod/v4";

const formSchema = z.object({
  name: z.string().min(1, { error: "Name is required" }),
  categoryName: z.string().min(1, { error: "Category is required" }),
  categoryId: z.number().int().optional(),
  quantity: z.int().min(1),
  grams: z.preprocess((v) => (v === "" ? undefined : v), z.int().optional()),
});

interface Props {
  opened: boolean;
  onClose: () => void;
  item: ClientGearInventoryItem | null;
}

export default function EditDrawer({ opened, onClose, item }: Props) {
  const createItem = useCreateGearInventoryItem();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const form = useForm({
    initialValues: {
      name: "",
      categoryName: "",
      categoryId: undefined as number | undefined,
      quantity: 1,
      grams: "" as string | number,
    },
    validate: schemaResolver(formSchema, { sync: true }),
  });

  const [debouncedCategory] = useDebouncedValue(form.values.categoryName, 200);
  const categorySearch = useGearCategorySearch(debouncedCategory);
  const categoryOptions = categorySearch.data?.categories ?? [];

  useEffect(() => {
    form.setValues({
      name: item?.name ?? "",
      categoryName: item?.category.name ?? "",
      categoryId: item?.category.id,
      quantity: item?.quantity ?? 1,
      grams: item?.grams ?? "",
    });
  }, [item]);

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleSubmit = form.onSubmit((values) => {
    if (item === null) {
      createItem.mutate(
        {
          name: values.name,
          quantity: values.quantity as number,
          existingCategoryId: values.categoryId,
          newCategoryName: values.categoryId ? undefined : values.categoryName,
          grams: values.grams === "" ? undefined : (values.grams as number),
        },
        {
          onSuccess: handleClose,
        },
      );
    } else {
      console.log("User tried to edit the item", values);
    }
  });

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} size="lg" ff="var(--mantine-font-family-headings)">
          {item ? "Edit item" : "Add item"}
        </Text>
      }
      position="right"
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md" pt="xs">
          <TextInput
            label="Item name"
            placeholder="e.g. Big Agnes Copper Spur UL2"
            required
            {...form.getInputProps("name")}
          />
          <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
              const category = categoryOptions.find(
                (c) => String(c.id) === val,
              );
              if (category) {
                form.setFieldValue("categoryName", category.name);
                form.setFieldValue("categoryId", category.id);
              }
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <TextInput
                label="Category"
                placeholder="Search or type to create…"
                description="Pick an existing category or type a new one."
                required
                value={form.values.categoryName}
                error={form.errors.categoryName}
                onChange={(e) => {
                  form.setFieldValue("categoryName", e.currentTarget.value);
                  form.setFieldValue("categoryId", undefined);
                  combobox.openDropdown();
                }}
                onClick={() => combobox.openDropdown()}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
              />
            </Combobox.Target>
            <Combobox.Dropdown hidden={categoryOptions.length === 0}>
              <Combobox.Options>
                {categoryOptions.map((cat) => (
                  <Combobox.Option key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>
          <Group grow align="flex-end">
            <NumberInput
              label="Quantity"
              min={1}
              {...form.getInputProps("quantity")}
            />
            <NumberInput
              label="Weight (grams)"
              placeholder="e.g. 450"
              description="Optional"
              {...form.getInputProps("grams")}
            />
          </Group>
          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createItem.isPending}>
              {item ? "Save changes" : "Add item"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
