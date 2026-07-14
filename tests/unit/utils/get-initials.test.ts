import { getInitials } from "$/frontend/utils/get-initials";
import { describe, expect, it } from "bun:test";

describe("getInitials", () => {
  it("returns the first letter of the first and last name, uppercased", () => {
    expect(getInitials("Josiah Sayers")).toBe("JS");
  });

  it("uses only the first and last name when there are middle names", () => {
    expect(getInitials("Josiah David Sayers")).toBe("JS");
  });

  it("returns the first two letters, uppercased, for a single-word name", () => {
    expect(getInitials("Josiah")).toBe("JO");
  });

  it("collapses repeated whitespace between names", () => {
    expect(getInitials("Josiah   Sayers")).toBe("JS");
  });

  it("returns an empty string for an empty name", () => {
    expect(getInitials("")).toBe("");
  });
});
