import NotificationContent from "$/frontend/layout/app-shell/notification-content";
import {
  notificationKeys,
  useMarkNotificationsRead,
  useNotificationList,
} from "$/frontend/utils/api/notifications";
import { UNREAD_NOTIFICATIONS_PARAMS } from "$/frontend/utils/hooks/use-unread-notification-count";
import { Group } from "@mantine/core";
import { notifications as toasts } from "@mantine/notifications";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

const PULSE_DURATION_MS = 1000;
// Longer than Mantine's 4s default — this toast carries a title and
// sometimes a description, so it needs more than a glance to read. Hovering
// still pauses the countdown (Mantine's built-in behavior).
const TOAST_AUTO_CLOSE_MS = 8000;

/**
 * Watches the most recent unread notifications and, when any have a
 * `createdAt` newer than the newest one we'd already seen (arrived on some
 * refetch — no polling, just whatever next triggers one), rings the bell and
 * surfaces a toast per new notification. Comparing dates rather than the
 * total count means a batch of several arrivals each get their own toast,
 * and a total that changes for another reason (e.g. one read elsewhere)
 * doesn't falsely trigger one. Call this exactly once (in Header) — it has a
 * side effect (the toast), and Header is the one place in the tree that's
 * only ever mounted a single time, so two bell icons rendering at once can't
 * each fire their own toast for the same arrival.
 *
 * `enabled` is threaded through rather than checking session state
 * internally — Header already knows whether there's a session, and this
 * hook has no other reason to depend on auth. `showToast` defaults to the
 * real Mantine notifications call; tests inject a mock instead of reaching
 * for `mock.module`.
 */
export function useNotificationArrivalAlert(
  enabled: boolean,
  showToast: typeof toasts.show = toasts.show,
) {
  const { data } = useNotificationList(UNREAD_NOTIFICATIONS_PARAMS, {
    enabled,
  });
  const queryClient = useQueryClient();
  const markRead = useMarkNotificationsRead();
  const [, navigate] = useLocation();
  // `createdAt` comes back over JSON as a string despite the `Date` type on
  // ClientNotification (see notification-row.tsx's `new Date(...)` for the
  // same pattern) — track the max as epoch millis to keep comparisons cheap.
  const latestSeenAt = useRef<number | null>(null);
  const [pulsing, setPulsing] = useState(false);
  // Tracked outside the effect (rather than returned from it as a cleanup)
  // because invalidateQueries below causes this same query to refetch,
  // re-running the effect while the pulse is still active. An effect's
  // cleanup fires on every re-run, not just unmount, so a cleanup-based
  // timeout would get cancelled by that redundant run before it fires —
  // this only gets touched when a pulse actually starts or the hook unmounts.
  const pulseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pulseTimeout.current) {
        clearTimeout(pulseTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!data) {
      return;
    }

    const previous = latestSeenAt.current;
    const timestampsMs = data.notifications.map((notification) =>
      new Date(notification.createdAt).getTime(),
    );
    latestSeenAt.current = Math.max(previous ?? 0, ...timestampsMs);

    if (previous === null) {
      return;
    }

    const arrivals = data.notifications
      .filter((_, index) => timestampsMs[index]! > previous)
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );

    if (arrivals.length === 0) {
      return;
    }

    setPulsing(true);
    if (pulseTimeout.current) {
      clearTimeout(pulseTimeout.current);
    }
    pulseTimeout.current = setTimeout(
      () => setPulsing(false),
      PULSE_DURATION_MS,
    );

    // The panel/full-page queries are separate cache entries (different
    // params) and won't otherwise learn about this arrival until their own
    // staleTime lapses — invalidate them now so reopening the panel shows
    // the new notification instead of a stale, shorter list.
    queryClient.invalidateQueries({ queryKey: notificationKeys.all });

    arrivals.forEach((notification) => {
      // Mirrors NotificationRow's handleRowClick: mark read unconditionally
      // (everything here is unread by construction, since this query is
      // UNREAD_NOTIFICATIONS_PARAMS), only navigate if there's a link.
      const handleClick = () => {
        markRead.mutate([notification.id]);
        if (notification.referenceUrl) {
          navigate(notification.referenceUrl);
        }
        toasts.hide(toastId);
      };
      const toastId = showToast({
        color: "trail-green",
        autoClose: TOAST_AUTO_CLOSE_MS,
        message: (
          <Group
            wrap="nowrap"
            align="flex-start"
            gap="sm"
            onClick={handleClick}
            style={{
              cursor: notification.referenceUrl ? "pointer" : "default",
            }}
          >
            <NotificationContent notification={notification} showTime={false} />
          </Group>
        ),
      });
    });
  }, [data, showToast, queryClient, markRead, navigate]);

  return { pulsing };
}
