import { sortByPosition } from "$/frontend/utils/sort-by-position";
import type {
  ClientFullPackingList,
  ClientPackingList,
} from "$/transformers/packing-list";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import type { ClientPackingListSection } from "$/transformers/packing-list-section";
import type {
  editPackingList,
  newPackingList,
} from "$/validation/packing-list";
import type { createItem, updateItem } from "$/validation/packing-list/item";
import type {
  createSection,
  updateSection,
} from "$/validation/packing-list/section";
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export const packingListKeys = {
  detail: (id: number) => ["packing-list", id] as const,
  all: () => ["packing-lists"],
  search: (query: string) => ["packing-lists", "search", query] as const,
};

// Shared optimistic-update plumbing: cancel in-flight refetches, snapshot the
// cache for rollback, then apply `updater`. Pair with `rollbackList` in
// `onError` and an invalidate in `onSettled`.
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

function rollbackList(
  queryClient: QueryClient,
  queryKey: QueryKey,
  context: { previous?: ClientFullPackingList } | undefined,
) {
  if (context?.previous) {
    queryClient.setQueryData(queryKey, context.previous);
  }
}

/**
 * The backend makes no ordering guarantees, so sorting lives here — the single
 * read path into the cache. Sorting in `select` (rather than the queryFn) means
 * the order is reapplied on every read, including after optimistic cache
 * writes, so consumers never have to sort again.
 */
function sortPackingList<T extends ClientFullPackingList>(list: T): T {
  return {
    ...list,
    sections: sortByPosition(list.sections).map((section) => ({
      ...section,
      items: sortByPosition(section.items),
    })),
  };
}

export function usePackingListSearch(query: string, publicOnly = false) {
  return useQuery({
    queryKey: packingListKeys.search(query),
    queryFn: () =>
      apiClient<{ packingLists: ClientPackingList[] }>(
        `/api/packing-lists?query=${encodeURIComponent(query)}&publicOnly=${encodeURIComponent(publicOnly.toString())}`,
      ).then((res) => res.packingLists ?? []),
    enabled: query.length > 0 || publicOnly,
  });
}

export function usePackingLists() {
  return useQuery({
    queryKey: packingListKeys.all(),
    queryFn: () =>
      apiClient<{ packingLists: ClientPackingList[] }>(
        "/api/packing-lists",
      ).then((res) => res.packingLists),
  });
}

export function usePackingList(id: number) {
  return useQuery({
    queryKey: packingListKeys.detail(id),
    queryFn: () =>
      apiClient<{ packingList: ClientFullPackingList }>(
        `/api/packing-lists/${id}`,
      ).then((res) => res.packingList),
    select: sortPackingList,
  });
}

export function useDeletePackingList(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient(`/api/packing-lists/${listId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: packingListKeys.detail(listId) });
      queryClient.invalidateQueries({ queryKey: packingListKeys.all() });
    },
  });
}

export function useCreatePackingList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: z.input<typeof newPackingList>) =>
      apiClient<{ packingList: ClientFullPackingList }>("/api/packing-lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: packingListKeys.all() });
    },
  });
}

export function useUpdatePackingList(listId: number) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);
  return useMutation({
    mutationFn: (data: z.input<typeof editPackingList>) =>
      apiClient<{ packingList: ClientFullPackingList }>(
        `/api/packing-lists/${listId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    // Optimistically apply the edit so the UI updates instantly; roll back if
    // the request fails, then refetch to reconcile with the server.
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<ClientFullPackingList>(queryKey);
      queryClient.setQueryData<ClientFullPackingList>(queryKey, (old) =>
        old ? { ...old, ...data } : old,
      );
      return { previous };
    },
    onError: (_error, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useCreateSection(listId: number) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);
  return useMutation({
    mutationFn: (data: z.input<typeof createSection>) =>
      apiClient<{ section: ClientPackingListSection }>(
        `/api/packing-lists/${listId}/sections`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    // Append the server's section (with its real id) so it can be put straight
    // into edit mode — no temp id to swap, which avoids losing in-progress
    // input if the response lands mid-keystroke.
    onSuccess: ({ section }) => {
      queryClient.setQueryData<ClientFullPackingList>(queryKey, (old) =>
        old
          ? { ...old, sections: [...old.sections, { ...section, items: [] }] }
          : old,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateSection(listId: number) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);
  return useMutation({
    mutationFn: ({
      sectionId,
      ...data
    }: z.input<typeof updateSection> & { sectionId: number }) =>
      apiClient<{ section: ClientPackingListSection }>(
        `/api/packing-lists/${listId}/sections/${sectionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onMutate: ({ sectionId, ...data }) =>
      snapshotList(queryClient, queryKey, (list) => {
        let sections = list.sections;
        // Reorder: mirror the backend by pushing every section at or after the
        // new position down one, then placing the target — keeps the optimistic
        // order identical to what the refetch will return.
        if (data.sortPosition != null) {
          sections = sections.map((section) =>
            section.id !== sectionId &&
            section.sortPosition >= data.sortPosition!
              ? { ...section, sortPosition: section.sortPosition + 1 }
              : section,
          );
        }
        return {
          ...list,
          sections: sections.map((section) =>
            section.id === sectionId ? { ...section, ...data } : section,
          ),
        };
      }),
    onError: (_error, _vars, context) =>
      rollbackList(queryClient, queryKey, context),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteSection(listId: number) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);
  return useMutation({
    mutationFn: (sectionId: number) =>
      apiClient(`/api/packing-lists/${listId}/sections/${sectionId}`, {
        method: "DELETE",
      }),
    onMutate: (sectionId) =>
      snapshotList(queryClient, queryKey, (list) => ({
        ...list,
        sections: list.sections.filter((section) => section.id !== sectionId),
      })),
    onError: (_error, _sectionId, context) =>
      rollbackList(queryClient, queryKey, context),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useCreateItem(listId: number) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);
  return useMutation({
    mutationFn: ({
      sectionId,
      ...data
    }: z.input<typeof createItem> & { sectionId: number }) =>
      apiClient<{ item: ClientPackingListItem }>(
        `/api/packing-lists/${listId}/sections/${sectionId}/items`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    // Append the server's item (with its real id) so it can be revealed in edit
    // mode without a temp id to swap.
    onSuccess: ({ item }, { sectionId }) => {
      queryClient.setQueryData<ClientFullPackingList>(queryKey, (old) =>
        old
          ? {
              ...old,
              sections: old.sections.map((section) =>
                section.id === sectionId
                  ? { ...section, items: [...section.items, item] }
                  : section,
              ),
            }
          : old,
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useUpdateItem(listId: number) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);
  return useMutation({
    mutationFn: ({
      sectionId,
      itemId,
      ...data
    }: z.input<typeof updateItem> & { sectionId: number; itemId: number }) =>
      apiClient<{ item: ClientPackingListItem }>(
        `/api/packing-lists/${listId}/sections/${sectionId}/items/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onMutate: ({ sectionId, itemId, ...data }) =>
      snapshotList(queryClient, queryKey, (list) => ({
        ...list,
        sections: list.sections.map((section) => {
          if (section.id !== sectionId) return section;
          let items = section.items;
          // Reorder: mirror the backend (push items at/after the new position
          // down, then place the target). Item positions span the whole
          // section, so optional and required items share one sequence.
          if (data.sortPosition != null) {
            items = items.map((item) =>
              item.id !== itemId && item.sortPosition >= data.sortPosition!
                ? { ...item, sortPosition: item.sortPosition + 1 }
                : item,
            );
          }
          return {
            ...section,
            items: items.map((item) =>
              item.id === itemId ? { ...item, ...data } : item,
            ),
          };
        }),
      })),
    onError: (_error, _vars, context) =>
      rollbackList(queryClient, queryKey, context),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDeleteItem(listId: number) {
  const queryClient = useQueryClient();
  const queryKey = packingListKeys.detail(listId);
  return useMutation({
    mutationFn: ({
      sectionId,
      itemId,
    }: {
      sectionId: number;
      itemId: number;
    }) =>
      apiClient(
        `/api/packing-lists/${listId}/sections/${sectionId}/items/${itemId}`,
        { method: "DELETE" },
      ),
    onMutate: ({ sectionId, itemId }) =>
      snapshotList(queryClient, queryKey, (list) => ({
        ...list,
        sections: list.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.filter((item) => item.id !== itemId),
              }
            : section,
        ),
      })),
    onError: (_error, _vars, context) =>
      rollbackList(queryClient, queryKey, context),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
