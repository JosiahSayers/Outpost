import type { Feature, Features } from "$/utils/features";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

interface AdminFeatureListResult {
  features: ReturnType<typeof Features.featureList>;
}

export type AdminFeatureDetail = Awaited<ReturnType<typeof Features.status>>;

interface AdminFeatureDetailResult {
  feature: AdminFeatureDetail;
}

export const adminFeatureKeys = {
  all: ["admin", "features"] as const,
  list: () => [...adminFeatureKeys.all, "list"] as const,
  detail: (feature: Feature) =>
    [...adminFeatureKeys.all, "detail", feature] as const,
};

export function useAdminFeatures() {
  return useQuery({
    queryKey: adminFeatureKeys.list(),
    queryFn: () => apiClient<AdminFeatureListResult>("/admin/features"),
  });
}

export function useAdminFeatureDetail(feature: Feature, enabled: boolean) {
  return useQuery({
    queryKey: adminFeatureKeys.detail(feature),
    queryFn: () =>
      apiClient<AdminFeatureDetailResult>(`/admin/features/${feature}`),
    enabled,
  });
}

function setDetailCache(
  queryClient: ReturnType<typeof useQueryClient>,
  feature: Feature,
  updater: (detail: AdminFeatureDetail) => AdminFeatureDetail,
) {
  queryClient.setQueryData<AdminFeatureDetailResult>(
    adminFeatureKeys.detail(feature),
    (old) => (old ? { feature: updater(old.feature) } : old),
  );
}

export function useToggleFeature(feature: Feature) {
  const queryClient = useQueryClient();
  const queryKey = adminFeatureKeys.detail(feature);

  return useMutation({
    mutationFn: (nextEnabled: boolean) =>
      apiClient(
        `/admin/features/${feature}/${nextEnabled ? "enable" : "disable"}`,
        {
          method: "POST",
        },
      ),
    onMutate: async (nextEnabled) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<AdminFeatureDetailResult>(queryKey);
      setDetailCache(queryClient, feature, (detail) => ({
        ...detail,
        enabled: nextEnabled,
      }));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useEnableFeatureForUser(feature: Feature) {
  const queryClient = useQueryClient();
  const queryKey = adminFeatureKeys.detail(feature);

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient(`/admin/features/${feature}/user/${userId}/enable`, {
        method: "POST",
      }),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<AdminFeatureDetailResult>(queryKey);
      setDetailCache(queryClient, feature, (detail) => ({
        ...detail,
        enabledUserIds: detail.enabledUserIds.includes(userId)
          ? detail.enabledUserIds
          : [...detail.enabledUserIds, userId],
        disabledUserIds: detail.disabledUserIds.filter((id) => id !== userId),
      }));
      return { previous };
    },
    onError: (_error, _userId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function useDisableFeatureForUser(feature: Feature) {
  const queryClient = useQueryClient();
  const queryKey = adminFeatureKeys.detail(feature);

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient(`/admin/features/${feature}/user/${userId}/disable`, {
        method: "POST",
      }),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<AdminFeatureDetailResult>(queryKey);
      setDetailCache(queryClient, feature, (detail) => ({
        ...detail,
        enabledUserIds: detail.enabledUserIds.filter((id) => id !== userId),
        disabledUserIds: detail.disabledUserIds.includes(userId)
          ? detail.disabledUserIds
          : [...detail.disabledUserIds, userId],
      }));
      return { previous };
    },
    onError: (_error, _userId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
