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

// Accepts either one setting or several so callers changing a whole batch
// at once (e.g. enabling push defaults across every notification) don't
// need to fire this once per slug -- the PATCH route already accepts an
// array either way.
export function useUpdateAccountSetting() {
  const queryClient = useQueryClient();
  const queryKey = accountSettingsKeys.all;
  return useMutation({
    mutationFn: (input: AccountSettingInput | AccountSettingInput[]) => {
      const settings = Array.isArray(input) ? input : [input];
      return apiClient("/api/account/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
    },
    // Optimistically apply the new value(s) so the UI updates instantly;
    // roll back if the request fails, then refetch to reconcile.
    onMutate: async (input) => {
      const settings = Array.isArray(input) ? input : [input];
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
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
