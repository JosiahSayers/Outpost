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
