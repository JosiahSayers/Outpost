import type { AdminStat, SupportedStat } from "$/utils/admin/stats";
import { useQueries, useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export const adminDashboardKeys = {
  stats: ["admin", "dashboard", "stats"] as const,
  stat: (stat: SupportedStat) => ["admin", "dashboard", "stats", stat] as const,
};

export function useAdminDashboardStats() {
  return useQuery({
    queryKey: adminDashboardKeys.stats,
    queryFn: () =>
      apiClient<{ statsWithSortPosition: Record<SupportedStat, number> }>(
        "/admin/dashboard/stats",
      ),
  });
}

export function useAdminStatValues(stats: SupportedStat[]) {
  return useQueries({
    queries: stats.map((stat) => ({
      queryKey: adminDashboardKeys.stat(stat),
      queryFn: () =>
        apiClient<{ stat: AdminStat }>(`/admin/dashboard/stats/${stat}`),
    })),
  });
}
