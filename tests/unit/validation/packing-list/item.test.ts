import { createItem, updateItem } from "$/validation/packing-list/item";
import { describe, expect, it } from "bun:test";

describe("createItem", () => {
  const validInput = {
    name: "Tent",
    quantity: 1,
  };

  it("accepts a minimal valid payload", () => {
    const result = createItem.parse(validInput);
    expect(result).toMatchObject({
      name: "Tent",
      quantity: 1,
      optional: false,
    });
  });

  it("defaults optional to false when omitted", () => {
    const result = createItem.parse(validInput);
    expect(result.optional).toBe(false);
  });

  it("accepts an explicit optional flag", () => {
    const result = createItem.parse({ ...validInput, optional: true });
    expect(result.optional).toBe(true);
  });

  it("trims and requires a minimum length name", () => {
    expect(() => createItem.parse({ ...validInput, name: "  " })).toThrow();
    expect(() => createItem.parse({ ...validInput, name: "ab" })).toThrow();
    expect(createItem.parse({ ...validInput, name: "  Tent  " }).name).toBe(
      "Tent",
    );
  });

  it("requires quantity to be a positive integer", () => {
    expect(() => createItem.parse({ ...validInput, quantity: 0 })).toThrow();
    expect(() => createItem.parse({ ...validInput, quantity: 1.5 })).toThrow();
  });

  it("accepts optional sortPosition, assignedGearId, and gearCategoryId", () => {
    const result = createItem.parse({
      ...validInput,
      sortPosition: 2,
      assignedGearId: "gear-1",
      gearCategoryId: "category-1",
    });
    expect(result).toMatchObject({
      sortPosition: 2,
      assignedGearId: "gear-1",
      gearCategoryId: "category-1",
    });
  });

  it("does not accept a trackGearAssignment field", () => {
    expect(() =>
      createItem.parse({ ...validInput, trackGearAssignment: true }),
    ).toThrow();
  });

  it("rejects unknown fields", () => {
    expect(() => createItem.parse({ ...validInput, extra: "nope" })).toThrow();
  });
});

describe("updateItem", () => {
  it("accepts an empty payload since every field is optional", () => {
    expect(updateItem.parse({})).toEqual({});
  });

  it("accepts a partial update", () => {
    const result = updateItem.parse({ name: "Sleeping Bag" });
    expect(result).toEqual({ name: "Sleeping Bag" });
  });

  describe("trackGearAssignment", () => {
    it("accepts true", () => {
      expect(updateItem.parse({ trackGearAssignment: true })).toEqual({
        trackGearAssignment: true,
      });
    });

    it("accepts false", () => {
      expect(updateItem.parse({ trackGearAssignment: false })).toEqual({
        trackGearAssignment: false,
      });
    });

    it("is omitted from the result when not provided", () => {
      const result = updateItem.parse({ name: "Sleeping Bag" });
      expect(result).not.toHaveProperty("trackGearAssignment");
    });

    it("rejects non-boolean values", () => {
      expect(() => updateItem.parse({ trackGearAssignment: "true" })).toThrow();
      expect(() => updateItem.parse({ trackGearAssignment: 1 })).toThrow();
    });

    it("can be combined with other fields in the same update", () => {
      const result = updateItem.parse({
        assignedGearId: null,
        trackGearAssignment: false,
      });
      expect(result).toEqual({
        assignedGearId: null,
        trackGearAssignment: false,
      });
    });
  });

  it("allows assignedGearId to be explicitly nulled", () => {
    expect(updateItem.parse({ assignedGearId: null })).toEqual({
      assignedGearId: null,
    });
  });

  it("rejects unknown fields", () => {
    expect(() => updateItem.parse({ extra: "nope" })).toThrow();
  });
});
