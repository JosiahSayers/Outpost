import { useNotificationList } from "$/frontend/utils/api/notifications";

// Shared with useNotificationArrivalAlert so both hooks hit the same React
// Query cache entry instead of firing two near-identical requests. `take`
// needs to be large enough for the arrival alert to see a burst of several
// new notifications at once — it has no effect on `total`, which comes from
// a separate DB count independent of how many rows are returned.
export const UNREAD_NOTIFICATIONS_PARAMS = {
  read: false,
  dismissed: false,
  take: 10,
} as const;

/**
 * Refreshes on mount/refetch only — there's deliberately no polling or push
 * for v1, so the badge can lag until the next page load or panel open.
 */
export function useUnreadNotificationCount() {
  const { data, isLoading } = useNotificationList(UNREAD_NOTIFICATIONS_PARAMS);

  return { count: data?.total ?? 0, isLoading };
}
