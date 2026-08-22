import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";

export const accountSettingsKeys = {
  all: ["account-settings"] as const,
};

// Callers narrow this to their own literal-slug union before calling
// mutate() -- the server independently re-validates every slug/value pair
// against $/validation/account-settings, so widening this to plain strings
// only loosens client-side autocomplete, not what's actually persisted.
export interface AccountSettingInput {
  slug: string;
  value: string;
}

export function useAccountSettings(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: accountSettingsKeys.all,
    queryFn: () =>
      apiClient<{ settings: ClientUserAccountSetting[] }>(
        "/api/account/settings",
      ).then((res) => res.settings),
    // Settings only change via useUpdateAccountSetting, which already
    // invalidates this key on settle, so there's no benefit to time-based
    // revalidation and it would just cause unwanted refetches/flicker for
    // AccountSettingsProvider's consumers.
    staleTime: Infinity,
    enabled: options?.enabled,
  });
}

export function useUpdateAccountSetting() {
  const queryClient = useQueryClient();
  const queryKey = accountSettingsKeys.all;
  return useMutation({
    mutationFn: (setting: AccountSettingInput) =>
      apiClient("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: [setting] }),
      }),
    // Optimistically apply the new value so the select updates instantly;
    // roll back if the request fails, then refetch to reconcile.
    onMutate: async (setting) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<ClientUserAccountSetting[]>(queryKey);
      queryClient.setQueryData<ClientUserAccountSetting[]>(queryKey, (old) =>
        old?.map((s) =>
          s.slug === setting.slug ? { ...s, value: setting.value } : s,
        ),
      );
      return { previous };
    },
    onError: (_error, _setting, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// Bulk variant for callers that need to change several settings in one
// request (e.g. enabling push defaults across every notification at once) --
// the PATCH route already accepts an array, this just exposes that instead
// of firing useUpdateAccountSetting once per slug.
export function useUpdateAccountSettings() {
  const queryClient = useQueryClient();
  const queryKey = accountSettingsKeys.all;
  return useMutation({
    mutationFn: (settings: AccountSettingInput[]) =>
      apiClient("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      }),
    onMutate: async (settings) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<ClientUserAccountSetting[]>(queryKey);
      queryClient.setQueryData<ClientUserAccountSetting[]>(queryKey, (old) =>
        old?.map((s) => {
          const update = settings.find((setting) => setting.slug === s.slug);
          return update ? { ...s, value: update.value } : s;
        }),
      );
      return { previous };
    },
    onError: (_error, _settings, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
