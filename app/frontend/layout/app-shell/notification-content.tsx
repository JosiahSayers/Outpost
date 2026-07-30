import NotificationIcon from "$/frontend/layout/app-shell/notification-icon";
import { formatRelativeTime } from "$/frontend/utils/format-relative-time";
import type { ClientNotification } from "$/transformers/notification";
import { Stack, Text } from "@mantine/core";

interface NotificationContentProps {
  notification: ClientNotification;
  bold?: boolean;
  showTime?: boolean;
}

// Icon + title/description(/time), shared between the row (panel, full page)
// and the arrival toast so both surfaces render a notification identically.
export default function NotificationContent({
  notification,
  bold = true,
  showTime = true,
}: NotificationContentProps) {
  return (
    <>
      <NotificationIcon icon={notification.icon} />
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={bold ? 700 : 400} lineClamp={2}>
          {notification.title}
        </Text>
        {notification.description && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {notification.description}
          </Text>
        )}
        {showTime && (
          <Text size="xs" c="dimmed">
            {formatRelativeTime(new Date(notification.createdAt))}
          </Text>
        )}
      </Stack>
    </>
  );
}
