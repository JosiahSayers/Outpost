/** Deterministic string -> [0, mod) bucket, for picking a stable option
 * (color, avatar, etc.) from a small palette based on a stable identifier. */
export function hashIndex(str: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}
