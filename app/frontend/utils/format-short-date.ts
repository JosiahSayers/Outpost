export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat(navigator.language, {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}
