import type { ClientNotification } from "$/transformers/notification";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { apiClient } from "./client";

export interface NotificationListResult {
  notifications: ClientNotification[];
  total: number;
  pageSize: number;
}

export interface NotificationListParams {
  read?: boolean;
  dismissed?: boolean;
  take?: number;
  skip?: number;
}

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params: NotificationListParams) =>
    ["notifications", "list", params] as const,
};

function buildQueryString(params: NotificationListParams): string {
  const search = new URLSearchParams();
  if (params.read !== undefined) search.set("read", String(params.read));
  if (params.dismissed !== undefined) {
    search.set("dismissed", String(params.dismissed));
  }
  if (params.take !== undefined) search.set("take", String(params.take));
  if (params.skip !== undefined) search.set("skip", String(params.skip));
  return search.toString();
}

function patchNotification(
  id: string,
  data: { read?: boolean; dismissed?: boolean },
) {
  return apiClient<{ notification: ClientNotification }>(
    `/api/notifications/${id}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    },
  );
}

// Shorter than the app-wide default (15 min, see query-client.ts) — just
// needs to cover the gap between polls (below) so a refetch from some other
// trigger (remount, reconnect) doesn't skip a beat.
const STALE_TIME_MS = 5 * 60 * 1000;

export function useNotificationList(
  params: NotificationListParams,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () =>
      apiClient<NotificationListResult>(
        `/api/notifications?${buildQueryString(params)}`,
      ),
    placeholderData: keepPreviousData,
    staleTime: STALE_TIME_MS,
    // Polls so the badge/panel picks up new arrivals without a manual
    // refresh. `refetchIntervalInBackground` defaults to false, which is
    // enough to stop this while the tab is hidden/backgrounded — React
    // Query's focus manager keys off `document.visibilityState`, not OS
    // window focus, so switching to another app with the tab still visible
    // (e.g. DevTools undocked) doesn't pause it.
    refetchInterval: 1 * 60 * 1000,
    enabled: options.enabled,
  });
}

/**
 * Removing a notification from `queryKey`'s cached list is instant and
 * optimistic since the dismiss control is watched directly (row slides out
 * of the panel/page the user is looking at). Marking read has no equivalent
 * live-watched moment — it happens on click-through or on panel close, both
 * of which navigate/unmount before staleness would be visible — so it stays
 * a plain invalidate below instead of carrying its own optimistic path.
 */
export function useDismissNotification(queryKey: QueryKey) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => patchNotification(id, { dismissed: true }),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<NotificationListResult>(queryKey);
      if (previous) {
        queryClient.setQueryData<NotificationListResult>(queryKey, {
          ...previous,
          notifications: previous.notifications.filter((n) => n.id !== id),
          total: Math.max(0, previous.total - 1),
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ids: string[]) =>
      Promise.all(ids.map((id) => patchNotification(id, { read: true }))),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
