import type { ClientGearCategory } from "$/transformers/gear-category";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export const gearCategoryKeys = {
  search: (query: string) => ["gear-categories", "search", query] as const,
};

export function useGearCategorySearch(query: string) {
  return useQuery({
    queryKey: gearCategoryKeys.search(query),
    queryFn: () =>
      apiClient<{ categories: ClientGearCategory[] }>(
        `/api/gear-categories?query=${encodeURIComponent(query)}`,
      ),
    enabled: query.length > 0,
  });
}
