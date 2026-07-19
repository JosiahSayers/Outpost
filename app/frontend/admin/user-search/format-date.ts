export function formatJoinedDate(date: Date | string): string {
  return new Intl.DateTimeFormat(navigator.language, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}
