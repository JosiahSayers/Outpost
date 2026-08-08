import type { Notification } from "../../generated/prisma/browser";

// The full set of Phosphor icon names any notification producer job is
// allowed to use. Kept as a plain list (no React/Mantine deps) so both the
// frontend icon map (notification-icon.tsx) and backend job data
// (create-notification.ts) can import it -- see notification-icon.tsx for
// why this can't just be "any Phosphor icon name".
export const NOTIFICATION_ICON_NAMES = [
  "FlagCheckeredIcon",
  "PersonSimpleHikeIcon",
  "RulerIcon",
  "WarningIcon",
] as const;

export type NotificationIconName = (typeof NOTIFICATION_ICON_NAMES)[number];

export type ClientNotification = Pick<
  Notification,
  | "id"
  | "title"
  | "description"
  | "read"
  | "dismissed"
  | "createdAt"
  | "icon"
  | "referenceUrl"
>;

export function transform(item: Notification): ClientNotification {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    read: item.read,
    dismissed: item.dismissed,
    createdAt: item.createdAt,
    icon: item.icon,
    referenceUrl: item.referenceUrl,
  };
}
