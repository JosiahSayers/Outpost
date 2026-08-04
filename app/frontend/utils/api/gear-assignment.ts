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
import { useCallback, useSyncExternalStore } from "react";
import { apiClient } from "./client";

/**
 * Gear assignment for packing list items (BTP-45).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * BACKEND STATUS — ASSIGN and CLEAR are both real; TRACK / DON'T TRACK is
 * still mocked.
 *
 *   ✅ ASSIGN gear .......... real. `updateItem` already accepts
 *                            `assignedGearId` and the PATCH route validates
 *                            that the gear belongs to the session user.
 *
 *   ✅ CLEAR an assignment .. real. `assignedGearId` is `.nullable()` in
 *                            `$/validation/packing-list/item`, and the PATCH
 *                            route passes `null` straight to Prisma to unset
 *                            the column (omitting the field still means
 *                            "leave unchanged").
 *
 *   ⚠️  TRACK / DON'T TRACK . MOCKED. There is no column for it. Needs
 *                            `PackingListItem.trackGear Boolean @default(true)`
 *                            (migration), the field added to
 *                            `$/transformers/packing-list-item`, and
 *                            `trackGear` accepted by `updateItem`.
 *
 * The mocked operation writes to a plain external store and never hits the
 * network, so it behaves correctly within a session but does not survive a
 * reload. It's written against the shape the real endpoint should return, so
 * landing the backend should mean deleting the mock rather than reworking
 * callers.
 * ────────────────────────────────────────────────────────────────────────────
 */

/** Where an item sits in the assign-or-dismiss decision. */
export type GearState = "assigned" | "undecided" | "untracked";

type GearTrackedMap = Record<string, boolean>;

/**
 * MOCK: stands in for `PackingListItem.trackGear`. Keyed by item id; absent
 * means tracked, matching the `@default(true)` the real column should carry.
 *
 * A plain external store rather than a query, deliberately: the real thing
 * will arrive as a field on the item, so the stand-in must not oblige rows and
 * section headers to sit inside a QueryClientProvider they would otherwise
 * never need. Delete all of this once the column exists and read
 * `item.trackGear` instead.
 */
let gearTrackedMock: GearTrackedMap = {};
const gearTrackedListeners = new Set<() => void>();

function subscribeGearTracked(listener: () => void) {
  gearTrackedListeners.add(listener);
  return () => {
    gearTrackedListeners.delete(listener);
  };
}

// Returns the same reference until a write replaces it, which is what
// useSyncExternalStore needs to avoid re-rendering on every check.
function gearTrackedSnapshot() {
  return gearTrackedMock;
}

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

/** MOCK: reads the stand-in `trackGear` map. */
export function useGearTrackedMap(): GearTrackedMap {
  return useSyncExternalStore(
    subscribeGearTracked,
    gearTrackedSnapshot,
    gearTrackedSnapshot,
  );
}

/**
 * MOCK: marks items as tracked / not tracked. Takes a map so the section-level
 * bulk action is one write rather than one per item — the real endpoint should
 * likewise accept a batch.
 */
export function setGearTrackedMock(updates: GearTrackedMap) {
  gearTrackedMock = { ...gearTrackedMock, ...updates };
  for (const listener of gearTrackedListeners) listener();
}

/** MOCK: hook form of `setGearTrackedMock`, for components to call. */
export function useSetGearTracked() {
  return useCallback(setGearTrackedMock, []);
}

/** MOCK: test seam, so suites don't leak decisions into one another. */
export function resetGearTrackedMock() {
  gearTrackedMock = {};
  for (const listener of gearTrackedListeners) listener();
}

export function gearStateFor(
  item: ClientPackingListItem,
  tracked: GearTrackedMap,
): GearState {
  if (item.assignedGear) return "assigned";
  // Absent means tracked, mirroring the column's intended `@default(true)`.
  return tracked[item.id] === false ? "untracked" : "undecided";
}

/** REAL: assigns an inventory item to a packing list item. */
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

/** REAL: clears a packing list item's assigned gear. */
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
