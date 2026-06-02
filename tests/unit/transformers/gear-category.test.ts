import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transform } from "$/transformers/gear-category";

describe("transform", () => {
  it("returns the expected shape", () => {
    const gearCategory = make("GearCategory");
    expect(transform(gearCategory)).toEqual({
      id: gearCategory.id,
      name: gearCategory.name,
      public: gearCategory.public,
    });
  });
});
