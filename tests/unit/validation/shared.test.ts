import { booleanQueryParam, numberQueryParam } from "$/validation/shared";
import { describe, expect, it } from "bun:test";

describe("numberQueryParam", () => {
  const testValidator = numberQueryParam(3);

  it("returns the default when passed undefined", () => {
    expect(testValidator.parse(undefined)).toBe(3);
  });

  it("returns the default when passed an empty string", () => {
    expect(testValidator.parse("")).toBe(3);
  });

  it("returns the default when passed a string with only whitespace", () => {
    expect(testValidator.parse("   ")).toBe(3);
  });

  it("returns a number when passed a string containing a number", () => {
    expect(testValidator.parse("41")).toBe(41);
  });

  describe("with min/max bounds", () => {
    const boundedValidator = numberQueryParam(3, { min: 1, max: 10 });

    it("returns the value when within bounds", () => {
      expect(boundedValidator.parse("5")).toBe(5);
    });

    it("returns the default when passed undefined", () => {
      expect(boundedValidator.parse(undefined)).toBe(3);
    });

    it("throws when passed a value below the minimum", () => {
      expect(() => boundedValidator.parse("0")).toThrow();
    });

    it("throws when passed a value above the maximum", () => {
      expect(() => boundedValidator.parse("11")).toThrow();
    });

    it("accepts values on the boundary", () => {
      expect(boundedValidator.parse("1")).toBe(1);
      expect(boundedValidator.parse("10")).toBe(10);
    });
  });

  it("treats a min of 0 as a real bound", () => {
    const validator = numberQueryParam(3, { min: 0 });
    expect(() => validator.parse("-1")).toThrow();
    expect(validator.parse("0")).toBe(0);
  });
});

describe("booleanQueryParam", () => {
  const testValidator = booleanQueryParam();

  it("returns undefined when passed undefined", () => {
    expect(testValidator.parse(undefined)).toBeUndefined();
  });

  it("returns true for the string 'true'", () => {
    expect(testValidator.parse("true")).toBe(true);
  });

  it("returns false for the string 'false'", () => {
    expect(testValidator.parse("false")).toBe(false);
  });

  it("passes through actual booleans", () => {
    expect(testValidator.parse(true)).toBe(true);
    expect(testValidator.parse(false)).toBe(false);
  });

  it("throws for other strings, including truthy-looking ones", () => {
    expect(() => testValidator.parse("yes")).toThrow();
    expect(() => testValidator.parse("1")).toThrow();
    expect(() => testValidator.parse("")).toThrow();
  });
});
