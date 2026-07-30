import { ThemeIcon } from "@mantine/core";
import { BellIcon, type Icon } from "@phosphor-icons/react";
import * as PhosphorIcons from "@phosphor-icons/react";

interface NotificationIconProps {
  icon: string | null;
  size?: number;
}

// `icon` is a raw Phosphor component name written by whichever job created
// the notification (e.g. "FlagCheckeredIcon"); look it up dynamically rather
// than maintaining a fixed enum, so new producers can use any Phosphor icon
// without a frontend change. Falls back to a bell for unknown/missing names.
export default function NotificationIcon({
  icon,
  size = 18,
}: NotificationIconProps) {
  const IconComponent =
    (icon && (PhosphorIcons as unknown as Record<string, Icon>)[icon]) ||
    BellIcon;

  return (
    <ThemeIcon variant="light" color="stone-gray" size={32} radius="xl">
      <IconComponent size={size} />
    </ThemeIcon>
  );
}
