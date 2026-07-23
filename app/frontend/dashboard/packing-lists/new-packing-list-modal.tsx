import Error from "$/frontend/shared-components/error";
import {
  useCreatePackingList,
  usePackingListSearch,
} from "$/frontend/utils/api/packing-list";
import { packingListName } from "$/validation/packing-list";
import {
  Button,
  Combobox,
  Group,
  Loader,
  Modal,
  Stack,
  Text,
  TextInput,
  useCombobox,
} from "@mantine/core";
import { schemaResolver, useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import { ListBulletsIcon } from "@phosphor-icons/react";
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
                rightSection={
                  search.isFetching ? <Loader size="xs" /> : undefined
                }
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
            <Combobox.Dropdown>
              <Combobox.Options>
                {searchResults.map((list) => (
                  <Combobox.Option key={list.id} value={String(list.id)}>
                    <Group gap="xs" wrap="nowrap" align="flex-start">
                      <ListBulletsIcon
                        size={16}
                        color="var(--mantine-color-trail-green-6)"
                        style={{ marginTop: 3, flexShrink: 0 }}
                      />
                      <div style={{ minWidth: 0 }}>
                        <Text size="sm" fw={600} lineClamp={1}>
                          {list.name}
                        </Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>
                          {list.totalSections} section
                          {list.totalSections !== 1 ? "s" : ""} ·{" "}
                          {list.totalItems} item
                          {list.totalItems !== 1 ? "s" : ""}
                        </Text>
                        {list.description && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {list.description}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Combobox.Option>
                ))}
                {searchResults.length === 0 &&
                  (search.isFetching ? (
                    <Combobox.Empty>
                      <Group gap="xs" justify="center">
                        <Loader size="xs" />
                        <Text size="sm" c="dimmed">
                          Searching…
                        </Text>
                      </Group>
                    </Combobox.Empty>
                  ) : (
                    <Combobox.Empty>No lists found</Combobox.Empty>
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
