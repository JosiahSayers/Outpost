import { randomInt } from "node:crypto";

// Excludes visually-ambiguous characters (0/O, 1/I) since these codes are
// meant to be read aloud or typed by a user quoting them back to support.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferenceId(length = 6): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}
