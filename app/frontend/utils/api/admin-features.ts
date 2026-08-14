import type { Features } from "$/utils/features";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

interface AdminFeatureListResult {
  features: ReturnType<typeof Features.featureList>;
}

export const adminFeatureKeys = {
  all: ["admin", "features"] as const,
  list: () => [...adminFeatureKeys.all, "list"] as const,
};

export function useAdminFeatures() {
  return useQuery({
    queryKey: adminFeatureKeys.list(),
    queryFn: () => apiClient<AdminFeatureListResult>("/admin/features"),
  });
}
