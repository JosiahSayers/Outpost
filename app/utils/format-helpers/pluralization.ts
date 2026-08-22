// Singular only at exactly 1 -- "0 items", not "0 item" -- matching how
// English (and every hand-written count ternary this replaces) actually
// treats zero.
export function pluralize(word: string, count: number, suffix = "s"): string {
  return count === 1 ? word : `${word}${suffix}`;
}
