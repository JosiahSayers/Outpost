import type { Trip } from "$/frontend/dashboard/types";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export const tripKeys = {
  all: ["trips"] as const,
};

export function useTrips() {
  return useQuery({
    queryKey: tripKeys.all,
    queryFn: () =>
      apiClient<{ trips: Trip[] }>("/api/trips").then((res) => res.trips),
  });
}
