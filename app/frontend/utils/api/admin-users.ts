import type { ClientAdminUser } from "$/transformers/admin/user";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { apiClient, ApiError } from "./client";

export interface AdminUserSearchResult {
  users: ClientAdminUser[];
  total: number;
  pageSize: number;
}

export const adminUserKeys = {
  search: (search: string, skip: number, take: number) =>
    ["admin", "users", "search", search, skip, take] as const,
};

export function useAdminUserSearch(search: string, skip: number, take: number) {
  const trimmed = search.trim();

  return useQuery({
    queryKey: adminUserKeys.search(trimmed, skip, take),
    queryFn: async () => {
      try {
        return await apiClient<AdminUserSearchResult>(
          `/admin/users?search=${encodeURIComponent(trimmed)}&skip=${skip}&take=${take}`,
        );
      } catch (err) {
        // The API returns 404 (rather than 200 with an empty array) when a
        // search has no matches — treat that as a valid empty result instead
        // of a query error.
        if (err instanceof ApiError && err.status === 404) {
          return { users: [], total: 0, pageSize: take };
        }
        throw err;
      }
    },
    enabled: trimmed.length > 0,
    placeholderData: keepPreviousData,
  });
}
