import ConfirmDeleteModal from "$/frontend/packing-list/confirm-delete-modal";
import { dayItems } from "$/frontend/trip/meal-plan/helpers";
import AssignPackingListDrawer from "$/frontend/trip/packing-lists/assign-packing-list-drawer";
import CategoryRow from "$/frontend/trip/packing-lists/category-row";
import PackingListEmptyState from "$/frontend/trip/packing-lists/empty-state";
import MealPlanSectionCard from "$/frontend/trip/packing-lists/meal-plan-section-card";
import ProgressOverview from "$/frontend/trip/packing-lists/progress-overview";
import { useUpdateMealPlanItemPackingStatus } from "$/frontend/utils/api/meal-plan";
import {
  useRemoveTripPackingList,
  useUpdateTripPackingListItem,
} from "$/frontend/utils/api/trip-packing-list";
import { sortByPosition } from "$/frontend/utils/sort-by-position";
import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientTripPackingList } from "$/transformers/trip-packing-list";
import { Button, Stack, Title } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useMemo } from "react";

interface Props {
  tripId: string;
  packingList: ClientTripPackingList | null;
  mealPlan: ClientMealPlanDay[];
}

export default function PackingListSection({
  tripId,
  packingList,
  mealPlan,
}: Props) {
  const [drawerOpened, { open: openDrawer, close: closeDrawer }] =
    useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);

  const removeAssignment = useRemoveTripPackingList(tripId);
  const updateItem = useUpdateTripPackingListItem(tripId);
  const updateMealItemStatus = useUpdateMealPlanItemPackingStatus(tripId);

  const sections = useMemo(
    () => (packingList ? sortByPosition(packingList.sections) : []),
    [packingList],
  );

  const mealDays = useMemo(
    () =>
      mealPlan
        .map((day) => ({ day, items: dayItems(day) }))
        .filter(({ items }) => items.length > 0),
    [mealPlan],
  );
  const hasMealItems = mealDays.length > 0;

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
    for (const { items } of mealDays) {
      for (const item of items) {
        total++;
        if (item.status.packed) packed++;
      }
    }
    return { packed, total };
  }, [sections, mealDays]);

  const mealPurchased = useMemo(
    () =>
      mealDays.reduce(
        (sum, { items }) =>
          sum + items.filter((item) => item.status.purchased).length,
        0,
      ),
    [mealDays],
  );
  const mealTotal = useMemo(
    () => mealDays.reduce((sum, { items }) => sum + items.length, 0),
    [mealDays],
  );

  function handleRemoveAssignment() {
    if (!packingList) return;
    removeAssignment.mutate(packingList.packingListId);
  }

  return (
    <Stack gap="sm">
      <Title order={3}>Packing List</Title>

      {(packingList || hasMealItems) && (
        <ProgressOverview
          packed={packed}
          total={total}
          packingListName={packingList?.name}
          purchased={hasMealItems ? mealPurchased : undefined}
          purchasedTotal={hasMealItems ? mealTotal : undefined}
        />
      )}

      {hasMealItems && (
        <MealPlanSectionCard
          days={mealDays}
          onToggleStatus={(dayNumber, itemId, data) =>
            updateMealItemStatus.mutate({ dayNumber, itemId, ...data })
          }
        />
      )}

      {packingList ? (
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
