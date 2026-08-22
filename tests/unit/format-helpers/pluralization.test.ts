import { pluralize } from "$/utils/format-helpers/pluralization";
import { describe, expect, it } from "bun:test";

describe("pluralize", () => {
  it("appends the suffix when the count is not 1", () => {
    expect(pluralize("test", 2)).toBe("tests");
    expect(pluralize("test", 0)).toBe("tests");
    expect(pluralize("test", -1)).toBe("tests");
  });

  it("returns the word as is when the count is exactly 1", () => {
    expect(pluralize("test", 1)).toBe("test");
  });

  it("allows overriding the applied suffix", () => {
    expect(pluralize("box", 100, "es")).toBe("boxes");
  });

  it("does not handle complex pluralizations", () => {
    expect(pluralize("mouse", 42)).toBe("mouses"); // correct form would be mice
  });
});
