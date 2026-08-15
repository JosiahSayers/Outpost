import type { ClientFeatureStatus } from "$/transformers/admin/features/status";
import type { Feature, Features } from "$/utils/features";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

interface AdminFeatureListResult {
  features: ReturnType<typeof Features.featureList>;
}

export type AdminFeatureDetail = ClientFeatureStatus;

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
      // The full user record isn't known client-side until the refetch below,
      // so only the disabled list (plain ids) can be updated optimistically.
      setDetailCache(queryClient, feature, (detail) => ({
        ...detail,
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
        enabledUsers: detail.enabledUsers.filter((user) => user.id !== userId),
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
