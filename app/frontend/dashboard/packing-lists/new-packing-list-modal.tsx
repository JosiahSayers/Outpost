import {
  useCreatePackingList,
  usePackingListSearch,
} from "$/frontend/utils/api/packing-list";
import Error from "$/frontend/shared-components/error";
import { packingListName } from "$/validation/packing-list";
import {
  Button,
  Combobox,
  Group,
  Modal,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { useLocation } from "wouter";
import { z } from "zod/v4";

const formSchema = z.object({
  name: packingListName,
  copyFromName: z.string(),
  copyFromId: z.number().int().optional(),
});

interface Props {
  opened: boolean;
  onClose: () => void;
}

export default function NewPackingListModal({ opened, onClose }: Props) {
  const [, navigate] = useLocation();
  const createList = useCreatePackingList();
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  });

  const form = useForm({
    initialValues: {
      name: "",
      copyFromName: "",
      copyFromId: undefined as number | undefined,
    },
    validate: schemaResolver(formSchema, { sync: true }),
  });

  const [debouncedQuery] = useDebouncedValue(form.values.copyFromName, 200);
  const search = usePackingListSearch(debouncedQuery, true);
  const searchResults = search.data ?? [];

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleSubmit = form.onSubmit((values) => {
    createList.mutate(
      { name: values.name, copiedFromPackingListId: values.copyFromId },
      {
        onSuccess: ({ packingList }) => {
          navigate(`/packing-lists/${packingList.id}`);
        },
      },
    );
  });

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="New Packing List"
      size="sm"
      centered
    >
      <Text c="dimmed" size="sm" mb="lg">
        Give your new list a name. Optionally, copy the sections and items from
        an existing list to use as a starting point.
      </Text>

      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="List name"
            placeholder="e.g. Weekend Kit"
            required
            {...form.getInputProps("name")}
          />

          <Combobox
            store={combobox}
            onOptionSubmit={(val) => {
              const list = search.data?.find((l) => String(l.id) === val);
              if (list) {
                form.setFieldValue("copyFromName", list.name);
                form.setFieldValue("copyFromId", list.id);
              }
              combobox.closeDropdown();
            }}
          >
            <Combobox.Target>
              <TextInput
                label="Copy from existing list"
                description="Leave blank to start with an empty list"
                placeholder="Search lists…"
                value={form.values.copyFromName}
                onChange={(e) => {
                  form.setFieldValue("copyFromName", e.currentTarget.value);
                  form.setFieldValue("copyFromId", undefined);
                  combobox.openDropdown();
                }}
                onClick={() => combobox.openDropdown()}
                onFocus={() => combobox.openDropdown()}
                onBlur={() => combobox.closeDropdown()}
              />
            </Combobox.Target>
            <Combobox.Dropdown hidden={searchResults.length === 0}>
              <Combobox.Options>
                {searchResults.map((list) => (
                  <Combobox.Option key={list.id} value={String(list.id)}>
                    {list.name}
                  </Combobox.Option>
                ))}
              </Combobox.Options>
            </Combobox.Dropdown>
          </Combobox>

          {createList.isError && <Error />}

          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createList.isPending}>
              Create list
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}
