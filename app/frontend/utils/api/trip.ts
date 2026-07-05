import type { Trip } from "$/frontend/dashboard/types";
import type { newTrip } from "$/validation/trip";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

// `editTrip`'s zod schema types `start`/`end` as `unknown` (an artifact of
// `z.coerce.date()`), but the frontend only ever sends ISO date strings, so
// this narrows to the shape our components actually produce.
type UpdateTripData = Partial<Omit<Trip, "id">>;

export const tripKeys = {
  all: ["trips"] as const,
  page: (skip: number, take: number) => ["trips", "page", skip, take] as const,
  detail: (id: string) => ["trips", "detail", id] as const,
};

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => apiClient<{ trip: Trip }>(`/api/trips/${id}`),
  });
}

export function useTrips() {
  return useQuery({
    queryKey: tripKeys.all,
    queryFn: () =>
      apiClient<{ trips: Trip[]; total: number; pageSize: number }>(
        "/api/trips",
      ),
  });
}

export function useTripsPage(skip: number, take: number, enabled = true) {
  return useQuery({
    queryKey: tripKeys.page(skip, take),
    queryFn: () =>
      apiClient<{ trips: Trip[]; total: number; pageSize: number }>(
        `/api/trips?skip=${skip}&take=${take}`,
      ),
    enabled,
    placeholderData: keepPreviousData,
  });
}

export function useUpdateTrip(id: string) {
  const queryClient = useQueryClient();
  const queryKey = tripKeys.detail(id);
  return useMutation({
    mutationFn: (data: UpdateTripData) =>
      apiClient<{ trip: Trip }>(`/api/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    // Optimistically apply the edit so the UI updates instantly; roll back if
    // the request fails, then refetch to reconcile with the server.
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: Trip }>(queryKey);
      queryClient.setQueryData<{ trip: Trip }>(queryKey, (old) =>
        old ? { trip: { ...old.trip, ...data } } : old,
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

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: z.input<typeof newTrip>) =>
      apiClient<{ trip: Trip }>("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}
