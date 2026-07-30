import { useUnreadNotificationCount } from "$/frontend/utils/hooks/use-unread-notification-count";
import { Indicator } from "@mantine/core";
import { BellIcon } from "@phosphor-icons/react";

interface NotificationBellIconProps {
  /** Briefly rings the bell — set true for one render after an unread count increase. */
  pulse?: boolean;
}

export default function NotificationBellIcon({
  pulse,
}: NotificationBellIconProps) {
  const { count } = useUnreadNotificationCount();

  return (
    <Indicator
      label={count > 9 ? "9+" : count}
      size={16}
      color="trail-green"
      offset={4}
      disabled={count === 0}
      // Indicator's root is `display: block` around an inline <svg>, which
      // leaves baseline descender space under the icon (the classic "image
      // in a div" gap) — that's what was pushing the bell glyph off-center.
      // Flex layout sizes the root to its content instead, so it disappears.
      styles={{ root: { display: "inline-flex", alignItems: "center" } }}
    >
      <BellIcon
        size={20}
        className={pulse ? "notification-bell--ring" : undefined}
      />
    </Indicator>
  );
}
