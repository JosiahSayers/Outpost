import NotificationIcon from "$/frontend/layout/app-shell/notification-icon";
import { formatRelativeTime } from "$/frontend/utils/format-relative-time";
import type { ClientNotification } from "$/transformers/notification";
import { ActionIcon, Box, Group, Stack, Text } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useLocation } from "wouter";

interface NotificationRowProps {
  notification: ClientNotification;
  onOpen: () => void;
  onDismiss: () => void;
}

export default function NotificationRow({
  notification,
  onOpen,
  onDismiss,
}: NotificationRowProps) {
  const [, navigate] = useLocation();
  const [hovered, setHovered] = useState(false);
  // Touch devices can't hover, so the dismiss control has to stay visible
  // unconditionally rather than waiting for a mouseenter that never fires.
  const isTouchDevice = useMediaQuery("(hover: none)");
  const showDismiss = hovered || isTouchDevice;

  const handleRowClick = () => {
    onOpen();
    if (notification.referenceUrl) {
      navigate(notification.referenceUrl);
    }
  };

  return (
    <Group
      wrap="nowrap"
      align="flex-start"
      gap="sm"
      px="sm"
      py={8}
      onClick={handleRowClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: "var(--mantine-radius-sm)",
        cursor: notification.referenceUrl ? "pointer" : "default",
        background: notification.read
          ? undefined
          : "var(--mantine-color-trail-green-0)",
      }}
    >
      <Box
        w={7}
        h={7}
        mt={8}
        style={{
          flexShrink: 0,
          borderRadius: "50%",
          background: notification.read
            ? "transparent"
            : "var(--mantine-color-trail-green-6)",
        }}
      />
      <NotificationIcon icon={notification.icon} />
      <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
        <Text size="sm" fw={notification.read ? 400 : 700} lineClamp={2}>
          {notification.title}
        </Text>
        {notification.description && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {notification.description}
          </Text>
        )}
        <Text size="xs" c="dimmed">
          {formatRelativeTime(new Date(notification.createdAt))}
        </Text>
      </Stack>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="sm"
        aria-label="Dismiss notification"
        style={{
          visibility: showDismiss ? "visible" : "hidden",
          flexShrink: 0,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
      >
        <XIcon size={14} />
      </ActionIcon>
    </Group>
  );
}
