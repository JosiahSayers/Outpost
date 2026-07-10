import { detectDefaultUnitFromLocale } from "$/frontend/shared-components/converter/detect-default-unit";
import { describe, expect, it } from "bun:test";

const regionDefaults: Partial<Record<string, "ml" | "cupsUS">> = {
  US: "cupsUS",
};

describe("detectDefaultUnitFromLocale", () => {
  it("returns the mapped unit for a known region", () => {
    expect(detectDefaultUnitFromLocale("en-US", regionDefaults, "ml")).toBe(
      "cupsUS",
    );
  });

  it("returns the fallback for an unmapped region", () => {
    expect(detectDefaultUnitFromLocale("en-GB", regionDefaults, "ml")).toBe(
      "ml",
    );
  });

  it("returns the fallback for a malformed locale string", () => {
    expect(
      detectDefaultUnitFromLocale("not-a-locale!!", regionDefaults, "ml"),
    ).toBe("ml");
  });
});
