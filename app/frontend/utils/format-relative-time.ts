/**
 * Compact relative time for notification rows: "12m ago", "2h ago", "3d ago".
 * Plain arithmetic rather than a date library's locale-formatted relative
 * time, which runs long ("3 days ago") for a list row this narrow.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diffSeconds = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 1000),
  );

  if (diffSeconds < 60) {
    return "just now";
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
