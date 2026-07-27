import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import AssignPackingListDrawer from "$/frontend/trip/packing-lists/assign-packing-list-drawer";
import CategoryRow from "$/frontend/trip/packing-lists/category-row";
import PackingListEmptyState from "$/frontend/trip/packing-lists/empty-state";
import ProgressOverview from "$/frontend/trip/packing-lists/progress-overview";
import {
  useRemoveTripPackingList,
  useUpdateTripPackingListItem,
} from "$/frontend/utils/api/trip-packing-list";
import { sortByPosition } from "$/frontend/utils/sort-by-position";
import type { ClientTripPackingList } from "$/transformers/trip-packing-list";
import { Button, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo } from "react";

interface Props {
  tripId: string;
  packingList: ClientTripPackingList | null;
}

export default function PackingListSection({ tripId, packingList }: Props) {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const removeAssignment = useRemoveTripPackingList(tripId);
  const updateItem = useUpdateTripPackingListItem(tripId);

  const sections = useMemo(
    () => (packingList ? sortByPosition(packingList.sections) : []),
    [packingList],
  );

  const { packed, total } = useMemo(() => {
    let packed = 0;
    let total = 0;
    for (const section of sections) {
      for (const item of section.items) {
        if (item.status.notNeeded) continue;
        total++;
        if (item.status.packed) packed++;
      }
    }
    return { packed, total };
  }, [sections]);

  function handleRemoveAssignment() {
    if (!packingList) return;
    removeAssignment.mutate(packingList.packingListId);
  }

  return (
    <Stack gap="sm">
      <Title order={3}>Packing List</Title>

      {packingList ? (
        <>
          <ProgressOverview
            packed={packed}
            total={total}
            packingListName={packingList.name}
          />

          <Stack gap="xs">
            {sections.map((section) => (
              <CategoryRow
                key={section.id}
                section={section}
                onTogglePacked={(itemId, packed) =>
                  updateItem.mutate({
                    listId: packingList.packingListId,
                    itemId,
                    packed,
                  })
                }
                onToggleNotNeeded={(itemId, notNeeded) =>
                  updateItem.mutate({
                    listId: packingList.packingListId,
                    itemId,
                    notNeeded,
                  })
                }
              />
            ))}
            <Button
              variant="subtle"
              color="red"
              size="sm"
              style={{ alignSelf: "flex-start" }}
              onClick={openDeleteModal}
              mt="md"
            >
              Remove packing list assignment
            </Button>
          </Stack>
        </>
      ) : (
        <PackingListEmptyState onAssign={openDrawer} />
      )}

      <AssignPackingListDrawer
        tripId={tripId}
        opened={drawerOpened}
        onClose={closeDrawer}
        onAssigned={() => {}}
      />

      <ConfirmDeleteModal
        opened={deleteModalOpened}
        onClose={closeDeleteModal}
        onConfirm={handleRemoveAssignment}
        title="Remove packing list assignment?"
        confirmLabel="Remove"
      >
        This removes the packing list assignment and all packing list item
        statuses for this trip — this can't be undone. The packing list itself
        won't be affected.
      </ConfirmDeleteModal>
    </Stack>
  );
}
