import { packingListKeys } from "$/frontend/utils/api/packing-list";
import type { ClientFullPackingList } from "$/transformers/packing-list";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { apiClient } from "./client";

/** Where an item sits in the assign-or-dismiss decision. */
export type GearState = "assigned" | "undecided" | "untracked";

// Shared optimistic plumbing, mirroring the helpers in `./packing-list`.
async function snapshotList(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (list: ClientFullPackingList) => ClientFullPackingList,
): Promise<{ previous?: ClientFullPackingList }> {
  await queryClient.cancelQueries({ queryKey });
  const previous = queryClient.getQueryData<ClientFullPackingList>(queryKey);
  if (previous) {
    queryClient.setQueryData<ClientFullPackingList>(
      queryKey,
      updater(previous),
    );
  }
  return { previous };
}

function setItem(
  list: ClientFullPackingList,
  itemId: string,
  patch: Partial<ClientPackingListItem>,
): ClientFullPackingList {
  return {
    ...list,
    sections: list.sections.map((section) => ({
      ...section,
      items: section.items.map((item) =>
        item.id === itemId ? { ...item, ...patch } : item,
      ),
    })),
  };
}

export function gearStateFor(item: ClientPackingListItem): GearState {
  if (item.assignedGear) return "assigned";
  return item.trackGearAssignment === false ? "untracked" : "undecided";
}

/** Assigns an inventory item to a packing list item. */
export function useAssignGear(listId: string) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);

  return useMutation({
    mutationFn: ({
      sectionId,
      item,
      gear,
    }: {
      sectionId: string;
      item: ClientPackingListItem;
      gear: ClientGearInventoryItem;
    }) =>
      apiClient<{ item: ClientPackingListItem }>(
        `/api/packing-lists/${listId}/sections/${sectionId}/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedGearId: gear.id,
            // The PATCH route resolves `sortPosition` as
            // `req.body.sortPosition ?? currentHighestSort + 1`, so omitting it
            // silently moves the item to the end of its section. Send the
            // position it already has to keep the edit in place.
            sortPosition: item.sortPosition,
          }),
        },
      ),
    // Write the whole gear object rather than just the id, so the row can
    // render its name and weight before the refetch lands.
    onMutate: ({ item, gear }) =>
      snapshotList(queryClient, queryKey, (list) =>
        setItem(list, item.id, { assignedGear: gear }),
      ),
    onError: (_error, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/** Clears a packing list item's assigned gear. */
export function useClearGear(listId: string) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);

  return useMutation({
    mutationFn: ({
      sectionId,
      item,
    }: {
      sectionId: string;
      item: ClientPackingListItem;
    }) =>
      apiClient<{ item: ClientPackingListItem }>(
        `/api/packing-lists/${listId}/sections/${sectionId}/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assignedGearId: null,
            // Same reasoning as `useAssignGear`: omitting `sortPosition` would
            // silently move the item to the end of its section.
            sortPosition: item.sortPosition,
          }),
        },
      ),
    onMutate: ({ item }) =>
      snapshotList(queryClient, queryKey, (list) =>
        setItem(list, item.id, { assignedGear: null }),
      ),
    onError: (_error, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

/** Marks a packing list item as tracked or not tracked for gear. */
export function useSetTrackGearAssignment(listId: string) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);

  return useMutation({
    mutationFn: ({
      sectionId,
      item,
      trackGearAssignment,
    }: {
      sectionId: string;
      item: ClientPackingListItem;
      trackGearAssignment: boolean;
    }) =>
      apiClient<{ item: ClientPackingListItem }>(
        `/api/packing-lists/${listId}/sections/${sectionId}/items/${item.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trackGearAssignment,
            // Same reasoning as `useAssignGear`: omitting `sortPosition` would
            // silently move the item to the end of its section.
            sortPosition: item.sortPosition,
          }),
        },
      ),
    onMutate: ({ item, trackGearAssignment }) =>
      snapshotList(queryClient, queryKey, (list) =>
        setItem(list, item.id, { trackGearAssignment }),
      ),
    onError: (_error, _vars, context) => {
      if (context?.previous)
        queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
