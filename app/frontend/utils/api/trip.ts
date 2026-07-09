import { sortMealPlan } from "$/frontend/utils/sort-meal-plan";
import { sortTasks } from "$/frontend/utils/sort-tasks";
import type { ClientFullTrip, ClientTrip } from "$/transformers/trip";
import type { editTrip, newTrip } from "$/validation/trip";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export const tripKeys = {
  all: ["trips"] as const,
  page: (skip: number, take: number) => ["trips", "page", skip, take] as const,
  detail: (id: string) => ["trips", "detail", id] as const,
};

// The backend makes no ordering guarantees, so sorting lives here — the
// single read path into the cache. Sorting in `select` (rather than the
// queryFn) means the order is reapplied on every read, including after
// optimistic cache writes, so consumers never have to sort again.
function sortTrip(data: { trip: ClientFullTrip }): { trip: ClientFullTrip } {
  return {
    trip: {
      ...data.trip,
      tasks: sortTasks(data.trip.tasks),
      mealPlan: sortMealPlan(data.trip.mealPlan),
    },
  };
}

export function useTrip(id: string) {
  return useQuery({
    queryKey: tripKeys.detail(id),
    queryFn: () => apiClient<{ trip: ClientFullTrip }>(`/api/trips/${id}`),
    select: sortTrip,
  });
}

export function useTrips() {
  return useQuery({
    queryKey: tripKeys.all,
    queryFn: () =>
      apiClient<{ trips: ClientTrip[]; total: number; pageSize: number }>(
        "/api/trips",
      ),
  });
}

export function useTripsPage(skip: number, take: number, enabled = true) {
  return useQuery({
    queryKey: tripKeys.page(skip, take),
    queryFn: () =>
      apiClient<{ trips: ClientTrip[]; total: number; pageSize: number }>(
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
    mutationFn: (data: z.input<typeof editTrip>) =>
      apiClient<{ trip: ClientTrip }>(`/api/trips/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    // Optimistically apply the edit so the UI updates instantly; roll back if
    // the request fails, then refetch to reconcile with the server.
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ trip: ClientTrip }>(queryKey);
      queryClient.setQueryData<{ trip: ClientTrip }>(queryKey, (old) =>
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

export function useDeleteTrip(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient(`/api/trips/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: tripKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: z.input<typeof newTrip>) =>
      apiClient<{ trip: ClientTrip }>("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
}
