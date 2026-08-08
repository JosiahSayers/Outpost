import type { NotificationIconName } from "$/transformers/notification";
import { ThemeIcon } from "@mantine/core";
import {
  BellIcon,
  FlagCheckeredIcon,
  PersonSimpleHikeIcon,
  RulerIcon,
  WarningIcon,
  type Icon,
} from "@phosphor-icons/react";

interface NotificationIconProps {
  icon: string | null;
  size?: number;
}

// `icon` is a raw Phosphor component name written by whichever job created
// the notification (e.g. "FlagCheckeredIcon", one of NOTIFICATION_ICON_NAMES
// in $/transformers/notification). These must be statically imported and
// registered here rather than looked up dynamically off a
// `import * as PhosphorIcons` namespace object -- Bun's browser bundler
// doesn't reliably include icons from this package when they're only ever
// referenced via a dynamic string key (some render fine, others silently
// resolve to `undefined` at runtime), so a notification producer job adding
// a new icon name must add it here *and* to NOTIFICATION_ICON_NAMES --
// `satisfies` below fails to compile if the two lists drift in either
// direction. Falls back to a bell for unknown/missing names.
const ICONS = {
  FlagCheckeredIcon,
  PersonSimpleHikeIcon,
  RulerIcon,
  WarningIcon,
} satisfies Record<NotificationIconName, Icon>;

export default function NotificationIcon({
  icon,
  size = 18,
}: NotificationIconProps) {
  const IconComponent =
    (icon && ICONS[icon as NotificationIconName]) || BellIcon;

  return (
    <ThemeIcon variant="light" color="stone-gray" size={32} radius="xl">
      <IconComponent size={size} />
    </ThemeIcon>
  );
}
