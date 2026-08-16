import { buildContentDisposition } from "$/utils/content-disposition";
import { describe, expect, it } from "bun:test";

describe("buildContentDisposition", () => {
  it("defaults to attachment", () => {
    expect(buildContentDisposition("Route.pdf")).toBe(
      `attachment; filename="Route.pdf"; filename*=UTF-8''Route.pdf`,
    );
  });

  it("supports inline", () => {
    expect(buildContentDisposition("Route.pdf", "inline")).toBe(
      `inline; filename="Route.pdf"; filename*=UTF-8''Route.pdf`,
    );
  });

  it("keeps spaces unescaped in the quoted fallback but percent-encodes them in the extended value", () => {
    expect(buildContentDisposition("My Trip Route.pdf")).toBe(
      `attachment; filename="My Trip Route.pdf"; filename*=UTF-8''My%20Trip%20Route.pdf`,
    );
  });

  it("escapes double quotes in the fallback and percent-encodes them in the extended value", () => {
    expect(buildContentDisposition('quote".pdf')).toBe(
      `attachment; filename="quote\\".pdf"; filename*=UTF-8''quote%22.pdf`,
    );
  });

  it("percent-encodes RFC 5987 attr-char exclusions the extended value would otherwise leave raw", () => {
    expect(buildContentDisposition("(a)*'b.pdf")).toBe(
      `attachment; filename="(a)*'b.pdf"; filename*=UTF-8''%28a%29%2A%27b.pdf`,
    );
  });

  it("replaces non-ASCII characters with underscores in the fallback but preserves them via percent-encoding in the extended value", () => {
    const result = buildContentDisposition("café.pdf");
    expect(result).toBe(
      `attachment; filename="caf_.pdf"; filename*=UTF-8''caf%C3%A9.pdf`,
    );
    const extended = result.split("filename*=UTF-8''")[1]!;
    expect(decodeURIComponent(extended)).toBe("café.pdf");
  });

  it("strips control characters, including CR/LF, from both the fallback and the extended value", () => {
    expect(buildContentDisposition("evil\r\nfile.pdf")).toBe(
      `attachment; filename="evilfile.pdf"; filename*=UTF-8''evilfile.pdf`,
    );
  });

  it("discards directory components and keeps only the basename", () => {
    expect(buildContentDisposition("../../etc/passwd")).toBe(
      `attachment; filename="passwd"; filename*=UTF-8''passwd`,
    );
  });

  it("treats backslash-style path separators as directory components too", () => {
    expect(buildContentDisposition("C:\\Users\\josiah\\report.pdf")).toBe(
      `attachment; filename="report.pdf"; filename*=UTF-8''report.pdf`,
    );
  });

  it("returns an empty filename for an empty or path-only input", () => {
    expect(buildContentDisposition("")).toBe(
      `attachment; filename=""; filename*=UTF-8''`,
    );
    expect(buildContentDisposition("a/b/")).toBe(
      `attachment; filename=""; filename*=UTF-8''`,
    );
  });
});
