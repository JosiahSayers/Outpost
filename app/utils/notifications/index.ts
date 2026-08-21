const PREFIX = "notification_";
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
  return `${PREFIX}${notification}${getSuffix(type)}`;
}

export const Notifications = {
  getSlug,
};
