export const NOTIFICATION_SLUG_PREFIX = "notification_";
const IN_APP_SUFFIX = "_in_app";
const EMAIL_SUFFIX = "_email";

export type NotificationType = "in_app" | "email";

function getSuffix(type: NotificationType): string {
  switch (type) {
    case "email":
      return EMAIL_SUFFIX;
    case "in_app":
      return IN_APP_SUFFIX;
  }
}

// Notification account settings are addressed by a structured slug
// (`notification_<name>_<in_app|email>`) rather than a bare setting id, so
// producers only need to know the notification's name and channel.
function getSlug(notification: string, type: NotificationType): string {
  return `${NOTIFICATION_SLUG_PREFIX}${notification}${getSuffix(type)}`;
}

export interface ParsedNotificationSlug {
  notification: string;
  type: NotificationType;
}

// Inverse of getSlug -- lets a consumer that only has the flat settings list
// (e.g. the notifications panel) recover which notification and channel a
// given slug belongs to, without hardcoding the notification's name.
function parseSlug(slug: string): ParsedNotificationSlug | null {
  if (!slug.startsWith(NOTIFICATION_SLUG_PREFIX)) return null;
  const body = slug.slice(NOTIFICATION_SLUG_PREFIX.length);

  if (body.endsWith(IN_APP_SUFFIX)) {
    return {
      notification: body.slice(0, -IN_APP_SUFFIX.length),
      type: "in_app",
    };
  }
  if (body.endsWith(EMAIL_SUFFIX)) {
    return { notification: body.slice(0, -EMAIL_SUFFIX.length), type: "email" };
  }
  return null;
}

export const Notifications = {
  getSlug,
  parseSlug,
};
