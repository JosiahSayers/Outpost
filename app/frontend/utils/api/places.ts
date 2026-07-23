import type { ClientPlace } from "$/transformers/place";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export const placesKeys = {
  search: (query: string) => ["places", "search", query] as const,
};

export function usePlacesSearch(query: string) {
  return useQuery({
    queryKey: placesKeys.search(query),
    queryFn: () =>
      apiClient<{ places: ClientPlace[] }>(
        `/api/places?query=${encodeURIComponent(query)}`,
      ).then((res) => res.places ?? []),
    enabled: query.length > 0,
    placeholderData: keepPreviousData,
  });
}
