import { tripKeys } from "$/frontend/utils/api/trip";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientFullTrip } from "$/transformers/trip";
import type { ClientTripPackingList } from "$/transformers/trip-packing-list";
import type { ClientTripPackingListItem } from "$/transformers/trip-packing-list/item";
import type {
  assignPackingList,
  editTripPackingListItem,
} from "$/validation/trip/packing-list";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export function useAssignTripPackingList(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: z.input<typeof assignPackingList>) =>
      apiClient<{ tripPackingList: ClientTripPackingList }>(
        `/api/trips/${tripId}/packing-list`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onError: notifyError("Couldn't assign packing list"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    },
  });
}

export function useRemoveTripPackingList(tripId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (packingListId: string) =>
      apiClient(`/api/trips/${tripId}/packing-list/${packingListId}`, {
        method: "DELETE",
      }),
    onError: notifyError("Couldn't remove packing list assignment"),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.detail(tripId) });
    },
  });
}

export function useUpdateTripPackingListItem(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: ({
      listId,
      itemId,
      ...data
    }: z.input<typeof editTripPackingListItem> & {
      listId: string;
      itemId: string;
    }) =>
      apiClient<{ item: ClientTripPackingListItem }>(
        `/api/trips/${tripId}/packing-list/${listId}/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    onMutate: async ({ itemId, ...data }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old?.trip.packingList
          ? {
              trip: {
                ...old.trip,
                packingList: {
                  ...old.trip.packingList,
                  sections: old.trip.packingList.sections.map((section) => ({
                    ...section,
                    items: section.items.map((item) =>
                      item.id === itemId
                        ? { ...item, status: { ...item.status, ...data } }
                        : item,
                    ),
                  })),
                },
              },
            }
          : old,
      );
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
