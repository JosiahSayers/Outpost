import { numberQueryParam } from "$/validation/shared";
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
});
