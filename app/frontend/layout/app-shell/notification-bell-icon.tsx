import { useUnreadNotificationCount } from "$/frontend/utils/hooks/use-unread-notification-count";
import { Indicator } from "@mantine/core";
import { BellIcon } from "@phosphor-icons/react";

export default function NotificationBellIcon() {
  const { count } = useUnreadNotificationCount();

  return (
    <Indicator
      label={count > 9 ? "9+" : count}
      size={16}
      color="trail-green"
      offset={4}
      disabled={count === 0}
    >
      <BellIcon size={20} />
    </Indicator>
  );
}
