export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  const first = parts.at(0);
  const last = parts.at(-1);

  if (!first || !last) return "";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();

  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}
