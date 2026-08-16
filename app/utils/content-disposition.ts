const CONTROL_CHARACTERS = /[\x00-\x1f\x7f]/g;
const QUOTE_OR_BACKSLASH = /[\\"]/g;
const NON_ASCII_PRINTABLE = /[^\x20-\x7e]/g;
// encodeURIComponent leaves -_.!~*'() unescaped, but RFC 5987's attr-char
// excludes *, ', (, ) -- those still need to be percent-encoded by hand.
const RESERVED_ATTR_CHARS = /['()*]/g;

function basename(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  const segments = normalized.split("/");
  return segments[segments.length - 1] ?? "";
}

function quotedString(value: string): string {
  const asciiOnly = value
    .replace(CONTROL_CHARACTERS, "")
    .replace(NON_ASCII_PRINTABLE, "_");
  return `"${asciiOnly.replace(QUOTE_OR_BACKSLASH, "\\$&")}"`;
}

function extendedValue(value: string): string {
  const stripped = value.replace(CONTROL_CHARACTERS, "");
  const encoded = encodeURIComponent(stripped).replace(
    RESERVED_ATTR_CHARS,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
  return `UTF-8''${encoded}`;
}

/**
 * Builds a `Content-Disposition` header value for `filename`, RFC
 * 6266/5987-compliant: an ASCII `filename=` fallback plus a `filename*=`
 * UTF-8 extended value for clients that support it. `filename` is treated as
 * untrusted -- control characters are stripped and any path segments are
 * discarded (only the basename is used) so it's safe to build this from a
 * user-supplied name.
 */
export function buildContentDisposition(
  filename: string,
  type: "attachment" | "inline" = "attachment",
): string {
  const name = basename(filename);
  return `${type}; filename=${quotedString(name)}; filename*=${extendedValue(name)}`;
}
