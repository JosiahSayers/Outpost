import NotificationContent from "$/frontend/layout/app-shell/notification-content";
import { DISMISS_ANIMATION_MS } from "$/frontend/utils/hooks/use-dismiss-animation";
import type { ClientNotification } from "$/transformers/notification";
import { ActionIcon, Box, Collapse, Group } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { XIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useLocation } from "wouter";

interface NotificationRowProps {
  notification: ClientNotification;
  dismissing: boolean;
  dismissible?: boolean;
  onOpen: () => void;
  onDismiss: () => void;
}

export default function NotificationRow({
  notification,
  dismissing,
  dismissible = true,
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
    if (dismissing) {
      return;
    }
    onOpen();
    if (notification.referenceUrl) {
      navigate(notification.referenceUrl);
    }
  };

  return (
    <Collapse expanded={!dismissing} transitionDuration={DISMISS_ANIMATION_MS}>
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
        <NotificationContent
          notification={notification}
          bold={!notification.read}
        />
        {dismissible && (
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            aria-label="Dismiss notification"
            disabled={dismissing}
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
        )}
      </Group>
    </Collapse>
  );
}
