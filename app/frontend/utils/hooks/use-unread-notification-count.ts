import { useNotificationList } from "$/frontend/utils/api/notifications";

/**
 * Refreshes on mount/refetch only — there's deliberately no polling or push
 * for v1, so the badge can lag until the next page load or panel open.
 */
export function useUnreadNotificationCount() {
  const { data, isLoading } = useNotificationList({
    read: false,
    dismissed: false,
    take: 1,
  });

  return { count: data?.total ?? 0, isLoading };
}
