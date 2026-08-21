import type { ClientGearCategory } from "$/transformers/gear-category";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export const gearCategoryKeys = {
  all: ["gear-categories"] as const,
  search: (query: string) => ["gear-categories", "search", query] as const,
  suggestions: (itemName: string) =>
    ["gear-categories", "suggestions", itemName] as const,
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

export function useGearCategorySuggestions(itemName: string) {
  return useQuery({
    queryKey: gearCategoryKeys.suggestions(itemName),
    queryFn: () =>
      apiClient<{ categories: ClientGearCategory[] }>(
        `/api/gear-categories/suggestions?itemName=${encodeURIComponent(itemName)}`,
      ),
    enabled: itemName.length > 0,
  });
}
