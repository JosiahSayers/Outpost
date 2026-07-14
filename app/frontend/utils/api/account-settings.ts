import type { ClientUserAccountSetting } from "$/transformers/account-settings/user-account-settings";
import type { accountSettings } from "$/validation/account-settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { apiClient } from "./client";

export const accountSettingsKeys = {
  all: ["account-settings"] as const,
};

export function useAccountSettings() {
  return useQuery({
    queryKey: accountSettingsKeys.all,
    queryFn: () =>
      apiClient<{ settings: ClientUserAccountSetting[] }>(
        "/api/account/settings",
      ).then((res) => res.settings),
  });
}

export function useUpdateAccountSetting() {
  const queryClient = useQueryClient();
  const queryKey = accountSettingsKeys.all;
  return useMutation({
    mutationFn: (setting: z.input<typeof accountSettings>) =>
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
