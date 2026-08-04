import { useQuery } from "@tanstack/react-query";
import { apiClient } from "./client";

export interface HealthCheckResult {
  version?: string;
  sha?: string;
  database?: string;
  redis?: string;
  failures?: string[];
}

export const healthKeys = {
  check: ["health"] as const,
};

export function useHealthCheck() {
  return useQuery({
    queryKey: healthKeys.check,
    queryFn: () => apiClient<HealthCheckResult>("/health"),
    refetchInterval: 5 * 60 * 1000,
    // A transient 5xx (redis/db blip) shouldn't be treated as a version-drift
    // signal, and isn't worth the app-wide 3x retry — just wait for the next
    // poll instead.
    retry: false,
  });
}
