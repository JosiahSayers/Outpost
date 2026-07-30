import type { Notification } from "../../generated/prisma/browser";

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
