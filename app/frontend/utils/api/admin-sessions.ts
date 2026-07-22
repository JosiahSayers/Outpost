import type { ClientSession } from "$/transformers/admin/session";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export type SessionStatusFilter = "active" | "expired" | "all";

export interface AdminUserSessionsResult {
  sessions: ClientSession[];
  total: number;
  pageSize: number;
}

export const adminSessionKeys = {
  list: (userId: string, status: SessionStatusFilter) =>
    ["admin", "users", userId, "sessions", status] as const,
};

export function useAdminUserSessions(
  userId: string,
  status: SessionStatusFilter,
) {
  return useQuery({
    queryKey: adminSessionKeys.list(userId, status),
    queryFn: () => {
      const params = new URLSearchParams({ take: "50" });
      if (status !== "all") {
        params.set("status", status);
      }
      // A 404 here means the user itself doesn't exist — the endpoint
      // always returns 200 with an empty array for a real user with no
      // sessions — so it's left to propagate as a query error.
      return apiClient<AdminUserSessionsResult>(
        `/admin/users/${userId}/sessions?${params}`,
      );
    },
  });
}

export function useRevokeSession(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      apiClient(`/admin/users/${userId}/sessions/${sessionId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin", "users", userId, "sessions"],
      });
    },
  });
}
