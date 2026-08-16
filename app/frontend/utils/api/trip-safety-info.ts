import { tripKeys } from "$/frontend/utils/api/trip";
import type { ClientFullTrip } from "$/transformers/trip";
import type { ClientTripSafetyInfo } from "$/transformers/trip-safety-info";
import type { editTripSafetyInfo } from "$/validation/trip/safety-info";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

const EMPTY_SAFETY_INFO: Omit<ClientTripSafetyInfo, "id"> = {
  emergencyContactName: null,
  emergencyContactPhone: null,
  expectedDepartureTime: null,
  expectedReturnTime: null,
  medicalNotes: null,
  permitOrRouteNumber: null,
  rangerStationName: null,
  rangerStationPhone: null,
  vehicleDescription: null,
};

export function useUpdateTripSafetyInfo(tripId: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(tripId);
  return useMutation({
    mutationFn: (data: z.input<typeof editTripSafetyInfo>) =>
      apiClient<{ safetyInfo: ClientTripSafetyInfo }>(
        `/api/trips/${tripId}/safety-info`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        },
      ),
    // The endpoint upserts, so there may be no record yet — optimistically
    // fill in the rest as unset rather than skipping the update entirely.
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientFullTrip }>(
        queryKey,
      );
      queryClient.setQueryData<{ trip: ClientFullTrip }>(queryKey, (old) =>
        old
          ? {
              trip: {
                ...old.trip,
                tripSafetyInfo: {
                  id: old.trip.tripSafetyInfo?.id ?? "",
                  ...EMPTY_SAFETY_INFO,
                  ...old.trip.tripSafetyInfo,
                  ...data,
                },
              },
            }
          : old,
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
