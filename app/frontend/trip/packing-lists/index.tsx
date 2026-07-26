import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import AssignPackingListDrawer from "$/frontend/trip/packing-lists/assign-packing-list-drawer";
import CategoryRow from "$/frontend/trip/packing-lists/category-row";
import ProgressOverview from "$/frontend/trip/packing-lists/progress-overview";
import {
  mergeCategories,
  packingCompletion,
  placeholderPackingLists,
  type PlaceholderPackingItem,
  type PlaceholderPackingList,
} from "$/frontend/trip/placeholder-data";
import { useRemoveTripPackingList } from "$/frontend/utils/api/trip-packing-list";
import { Button, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo, useState } from "react";

interface Props {
  tripId: string;
}

export default function PackingListSection({ tripId }: Props) {
  const [lists, setLists] = useState<PlaceholderPackingList[]>(
    placeholderPackingLists,
  );
  // The trip show endpoint doesn't return the assigned packing list yet, so
  // there's no way to know on load whether one is already assigned — this
  // tracks it locally from the assign/remove round trip in the meantime and
  // resets to "unassigned" on refresh until that's wired up.
  const [assignedPackingListId, setAssignedPackingListId] = useState<
    string | null
  >(null);

  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const removeAssignment = useRemoveTripPackingList(tripId);

  const categories = useMemo(() => mergeCategories(lists), [lists]);
  const { packed, total } = packingCompletion(lists);

  function updateItem(
    itemId: string,
    updates: Partial<Pick<PlaceholderPackingItem, "packed" | "notNeeded">>,
  ) {
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        categories: list.categories.map((category) => ({
          ...category,
          items: category.items.map((item) =>
            item.id === itemId ? { ...item, ...updates } : item,
          ),
        })),
      })),
    );
  }

  function handleRemoveAssignment() {
    if (!assignedPackingListId) return;
    removeAssignment.mutate(assignedPackingListId, {
      onSuccess: () => setAssignedPackingListId(null),
    });
  }

  return (
    <Stack gap="sm">
      <Title order={3}>Packing Lists</Title>

      <ProgressOverview
        packed={packed}
        total={total}
        numberOfPackingLists={lists.length}
      />

      <Stack gap="xs">
        {categories.map((category) => (
          <CategoryRow
            key={category.name}
            category={category}
            onTogglePacked={(itemId, packed) => updateItem(itemId, { packed })}
            onToggleNotNeeded={(itemId, notNeeded) =>
              updateItem(itemId, { notNeeded })
            }
          />
        ))}
        <Button
          variant="subtle"
          size="sm"
          style={{ alignSelf: "flex-start" }}
          onClick={assignedPackingListId ? openDeleteModal : openDrawer}
        >
          {assignedPackingListId
            ? "Remove packing list assignment"
            : "Assign a packing list"}
        </Button>
      </Stack>

      <AssignPackingListDrawer
        tripId={tripId}
        opened={drawerOpened}
        onClose={closeDrawer}
        onAssigned={(tripPackingList) =>
          setAssignedPackingListId(tripPackingList.packingListId)
        }
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
