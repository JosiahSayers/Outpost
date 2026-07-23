import { transform } from "$/transformers/place";
import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";

describe("transform", () => {
  it("passes through the stored publicAccess word", () => {
    expect(
      transform(make("Place", { publicAccess: "Open" })).publicAccess,
    ).toBe("Open");
    expect(
      transform(make("Place", { publicAccess: "Restricted" })).publicAccess,
    ).toBe("Restricted");
    expect(
      transform(make("Place", { publicAccess: "Closed" })).publicAccess,
    ).toBe("Closed");
    expect(
      transform(make("Place", { publicAccess: "Unknown" })).publicAccess,
    ).toBe("Unknown");
  });

  it("returns null when publicAccess is missing", () => {
    expect(
      transform(make("Place", { publicAccess: null })).publicAccess,
    ).toBeNull();
  });

  it("returns the expected shape", () => {
    const place = make("Place", { publicAccess: "Open" });
    expect(transform(place)).toEqual({
      id: place.id,
      name: place.name,
      state: place.state,
      publicAccess: "Open",
    });
  });
});
