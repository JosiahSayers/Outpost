import NotificationRow from "$/frontend/layout/app-shell/notification-row";
import {
  notificationKeys,
  useDismissNotification,
  useMarkNotificationsRead,
  useNotificationList,
} from "$/frontend/utils/api/notifications";
import { useDelayedLoading } from "$/frontend/utils/hooks/use-delayed-loading";
import { useDismissAnimation } from "$/frontend/utils/hooks/use-dismiss-animation";
import { useUnreadNotificationCount } from "$/frontend/utils/hooks/use-unread-notification-count";
import { Anchor, Center, Group, Loader, Stack, Text } from "@mantine/core";
import { Link } from "wouter";

const PANEL_QUERY = { dismissed: false, take: 5 };

interface NotificationPanelContentProps {
  onNavigate: () => void;
}

/**
 * Shared body for the desktop popover and the mobile left-drawer — header,
 * recent-notifications list, and a link out to the full /notifications page.
 */
export default function NotificationPanelContent({
  onNavigate,
}: NotificationPanelContentProps) {
  const {
    data,
    isLoading: rawIsLoading,
    isError,
  } = useNotificationList(PANEL_QUERY);
  const { isLoading, showSpinner } = useDelayedLoading(rawIsLoading);
  const queryKey = notificationKeys.list(PANEL_QUERY);
  const dismiss = useDismissNotification(queryKey);
  const markRead = useMarkNotificationsRead();
  const { count } = useUnreadNotificationCount();
  const { dismissingIds, beginDismiss } = useDismissAnimation((id) =>
    dismiss.mutate(id),
  );

  const handleOpen = (notificationId: string, read: boolean) => {
    if (!read) {
      markRead.mutate([notificationId]);
    }
    onNavigate();
  };

  return (
    <Stack gap={4} miw={280}>
      <Group justify="space-between" px="sm" pt="xs">
        <Text fw={700} size="sm" ff="var(--mantine-font-family-headings)">
          Notifications
        </Text>
        {count > 0 && (
          <Text size="xs" c="dimmed">
            {count} new
          </Text>
        )}
      </Group>

      {isLoading && showSpinner && (
        <Center py="md">
          <Loader size="sm" />
        </Center>
      )}

      {!isLoading && isError && (
        <Text size="sm" c="dimmed" px="sm" py="md">
          Couldn't load notifications.
        </Text>
      )}

      {!isLoading && !isError && data?.notifications.length === 0 && (
        <Text size="sm" c="dimmed" px="sm" py="md">
          You're all caught up.
        </Text>
      )}

      {!isLoading &&
        !isError &&
        data?.notifications.map((notification) => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            dismissing={dismissingIds.has(notification.id)}
            onOpen={() => handleOpen(notification.id, notification.read)}
            onDismiss={() => beginDismiss(notification.id)}
          />
        ))}

      <Anchor
        component={Link}
        href="/notifications"
        onClick={onNavigate}
        size="xs"
        px="sm"
        py="xs"
      >
        View all in Notifications →
      </Anchor>
    </Stack>
  );
}
