import { sortByPosition } from "$/frontend/utils/sort-by-position";
import type { ClientFullPackingList } from "$/transformers/packing-list";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import type { ClientPackingListSection } from "$/transformers/packing-list-section";
import type { editPackingList } from "$/validation/packing-list";
import type { createItem, updateItem } from "$/validation/packing-list/item";
import type {
  createSection,
  updateSection,
} from "$/validation/packing-list/section";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export const packingListKeys = {
  detail: (id: number) => ["packing-list", id] as const,
};

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

export function useUpdatePackingList(listId: number) {
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packingListKeys.detail(listId),
      });
    },
  });
}

export function useCreateSection(listId: number) {
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packingListKeys.detail(listId),
      });
    },
  });
}

export function useUpdateSection(listId: number) {
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packingListKeys.detail(listId),
      });
    },
  });
}

export function useDeleteSection(listId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: number) =>
      apiClient(`/api/packing-lists/${listId}/sections/${sectionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packingListKeys.detail(listId),
      });
    },
  });
}

export function useCreateItem(listId: number) {
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packingListKeys.detail(listId),
      });
    },
  });
}

export function useUpdateItem(listId: number) {
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packingListKeys.detail(listId),
      });
    },
  });
}

export function useDeleteItem(listId: number) {
  const queryClient = useQueryClient();
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
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: packingListKeys.detail(listId),
      });
    },
  });
}
