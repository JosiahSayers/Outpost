import type { ClientAdminPublicMealItem } from "$/transformers/admin/public-meal-item";
import type { createMeal, editMeal } from "$/validation/admin/meals";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export interface AdminMealsMetadata {
  vendors: string[];
  brands: string[];
}

export interface AdminMealsSearchResult {
  items: ClientAdminPublicMealItem[];
  hasMore: boolean;
}

export interface AdminMealsIncompleteResult {
  items: ClientAdminPublicMealItem[];
  total: number;
  pageSize: number;
}

export const adminMealKeys = {
  all: ["admin", "meals"] as const,
  metadata: () => [...adminMealKeys.all, "metadata"] as const,
  lists: () => [...adminMealKeys.all, "list"] as const,
  // Sorted so the cache key is stable regardless of the order vendor/brand
  // pills were toggled on in the filter bar.
  list: (
    query: string,
    vendor: string[],
    brand: string[],
    skip: number,
    take: number,
  ) =>
    [
      ...adminMealKeys.lists(),
      query,
      [...vendor].sort(),
      [...brand].sort(),
      skip,
      take,
    ] as const,
  incompleteLists: () => [...adminMealKeys.all, "incomplete"] as const,
  incomplete: (skip: number, take: number) =>
    [...adminMealKeys.incompleteLists(), skip, take] as const,
  readyOverrideLists: () => [...adminMealKeys.all, "ready-override"] as const,
  readyOverride: (skip: number, take: number) =>
    [...adminMealKeys.readyOverrideLists(), skip, take] as const,
};

// lists(), incompleteLists(), and readyOverrideLists() are separate branches
// of the key tree (see adminMealKeys above), so invalidating one doesn't
// touch the others -- mutations need all three to keep the plain search
// list, the "incomplete only" list, and the "manually marked ready" list in
// sync with each other.
function invalidateMealLists(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: adminMealKeys.lists() });
  queryClient.invalidateQueries({ queryKey: adminMealKeys.incompleteLists() });
  queryClient.invalidateQueries({
    queryKey: adminMealKeys.readyOverrideLists(),
  });
}

export function useAdminMealsMetadata() {
  return useQuery({
    queryKey: adminMealKeys.metadata(),
    queryFn: () =>
      apiClient<AdminMealsMetadata>("/admin/meals/established-metadata"),
  });
}

export function useAdminMealsSearch(
  query: string,
  vendor: string[],
  brand: string[],
  skip: number,
  take: number,
  options?: { enabled?: boolean },
) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: adminMealKeys.list(trimmed, vendor, brand, skip, take),
    queryFn: () => {
      const params = new URLSearchParams({
        skip: String(skip),
        take: String(take),
      });
      if (trimmed) params.set("query", trimmed);
      vendor.forEach((v) => params.append("vendor", v));
      brand.forEach((b) => params.append("brand", b));
      return apiClient<AdminMealsSearchResult>(`/admin/meals?${params}`);
    },
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });
}

// Flags public meal items missing brand/calories/waterMl/dryWeightGrams/
// image/sourceImageUrl -- see GET /admin/meals/incomplete. Paired with
// useAdminMealsSearch behind an `enabled` toggle in AdminMeals rather than
// merged into one hook, since the two endpoints return different shapes
// (total+pageSize vs. hasMore) and take no query/vendor/brand params.
export function useAdminMealsIncomplete(
  skip: number,
  take: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminMealKeys.incomplete(skip, take),
    queryFn: () => {
      const params = new URLSearchParams({
        skip: String(skip),
        take: String(take),
      });
      return apiClient<AdminMealsIncompleteResult>(
        `/admin/meals/incomplete?${params}`,
      );
    },
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });
}

// Flags public meal items an admin has manually overridden to "ready" (see
// readyOverride on PublicMealItem) despite a remaining gap -- see GET
// /admin/meals/ready-override. Mirrors useAdminMealsIncomplete's shape and
// enabled-toggle pairing with useAdminMealsSearch in AdminMeals.
export function useAdminMealsReadyOverride(
  skip: number,
  take: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: adminMealKeys.readyOverride(skip, take),
    queryFn: () => {
      const params = new URLSearchParams({
        skip: String(skip),
        take: String(take),
      });
      return apiClient<AdminMealsIncompleteResult>(
        `/admin/meals/ready-override?${params}`,
      );
    },
    placeholderData: keepPreviousData,
    enabled: options?.enabled,
  });
}

export function useCreateMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: z.input<typeof createMeal>) =>
      apiClient<ClientAdminPublicMealItem>("/admin/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateMealLists(queryClient),
  });
}

export function useUpdateMeal(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: z.input<typeof editMeal>) =>
      apiClient<ClientAdminPublicMealItem>(`/admin/meals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    onSuccess: () => invalidateMealLists(queryClient),
  });
}

export function useDeleteMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ignore = "false" }: { id: string; ignore?: string }) => {
      const params = new URLSearchParams({ ignore });
      return apiClient(`/admin/meals/${id}?${params}`, { method: "DELETE" });
    },
    onSuccess: () => invalidateMealLists(queryClient),
  });
}
