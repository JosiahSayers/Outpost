import Error from "$/frontend/shared-components/error";
import SearchCombobox from "$/frontend/shared-components/search-combobox";
import {
  packingListKeys,
  useMyPackingListSearch,
} from "$/frontend/utils/api/packing-list";
import { useAssignTripPackingList } from "$/frontend/utils/api/trip-packing-list";
import type { ClientTripPackingList } from "$/transformers/trip-packing-list";
import { pluralize } from "$/utils/format-helpers/pluralization";
import { Button, Drawer, Group, Stack, Text } from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import { ListBulletsIcon } from "@phosphor-icons/react";
import { useState, type SubmitEvent } from "react";

interface Props {
  tripId: string;
  opened: boolean;
  onClose: () => void;
  onAssigned: (tripPackingList: ClientTripPackingList) => void;
}

export default function AssignPackingListDrawer({
  tripId,
  opened,
  onClose,
  onAssigned,
}: Props) {
  const assignPackingList = useAssignTripPackingList(tripId);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | undefined>();

  const [debouncedQuery] = useDebouncedValue(query, 200);
  const search = useMyPackingListSearch(debouncedQuery, opened);
  const searchResults = search.data ?? [];

  const handleClose = () => {
    setQuery("");
    setSelectedId(undefined);
    assignPackingList.reset();
    onClose();
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedId) return;

    assignPackingList.mutate(
      { packingListId: selectedId },
      {
        onSuccess: (data) => {
          onAssigned(data.tripPackingList);
          handleClose();
        },
      },
    );
  };

  return (
    <Drawer
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} size="lg" ff="var(--mantine-font-family-headings)">
          Assign a packing list
        </Text>
      }
      position="right"
      size="md"
    >
      <form onSubmit={handleSubmit} noValidate>
        <Stack gap="md" pt="xs">
          <SearchCombobox
            label="Packing list"
            placeholder="Search your packing lists…"
            required
            value={query}
            onValueChange={(value) => {
              setQuery(value);
              setSelectedId(undefined);
            }}
            results={searchResults}
            isFetching={search.isFetching}
            searchKeyPrefix={packingListKeys.mineSearchAll}
            getOptionValue={(list) => list.id}
            onOptionSubmit={(list) => {
              setQuery(list.name);
              setSelectedId(list.id);
            }}
            icon={
              <ListBulletsIcon
                size={16}
                color="var(--mantine-color-trail-green-6)"
              />
            }
            renderOption={(list) => (
              <>
                <Text size="sm" fw={600} lineClamp={1}>
                  {list.name}
                </Text>
                <Text size="xs" c="dimmed" lineClamp={1}>
                  {list.totalSections}{" "}
                  {pluralize("section", list.totalSections)} · {list.totalItems}{" "}
                  {pluralize("item", list.totalItems)}
                </Text>
              </>
            )}
            emptyMessage="No packing lists found"
          />

          {assignPackingList.isError && <Error />}

          <Group justify="flex-end" mt="sm">
            <Button variant="subtle" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedId}
              loading={assignPackingList.isPending}
            >
              Assign list
            </Button>
          </Group>
        </Stack>
      </form>
    </Drawer>
  );
}
