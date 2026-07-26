import { hashIndex } from "$/frontend/utils/hash-index";
import { describe, expect, it } from "bun:test";

describe("hashIndex", () => {
  it("returns the same bucket for the same string every time", () => {
    expect(hashIndex("hello", 7)).toBe(hashIndex("hello", 7));
  });

  it("returns a known bucket for a given string and modulus", () => {
    expect(hashIndex("Shelter", 3)).toBe(2);
    expect(hashIndex("Clothing", 3)).toBe(0);
  });

  it("is case-sensitive", () => {
    expect(hashIndex("hello", 7)).not.toBe(hashIndex("Hello", 7));
  });

  it("always returns a value within [0, mod)", () => {
    for (const seed of ["a", "backpacking kit", "Cook & Food Kit", "🎒"]) {
      const result = hashIndex(seed, 5);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(5);
    }
  });

  it("returns 0 for an empty string", () => {
    expect(hashIndex("", 5)).toBe(0);
  });

  it("returns 0 when mod is 1", () => {
    expect(hashIndex("anything", 1)).toBe(0);
  });
});
