import { tripKeys } from "$/frontend/utils/api/trip";
import { notifyError } from "$/frontend/utils/notify-error";
import type { ClientTripPackingList } from "$/transformers/trip-packing-list";
import type { assignPackingList } from "$/validation/trip/packing-list";
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
