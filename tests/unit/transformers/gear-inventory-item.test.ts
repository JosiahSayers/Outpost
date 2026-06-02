import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transform } from "$/transformers/gear-inventory-item";

describe("transform", () => {
  it("returns the expected shape", () => {
    const gearCategory = make("GearCategory");
    const gearInventoryItem = make("GearInventoryItem", {
      gearCategoryId: gearCategory.id,
    });
    const input = {
      ...gearInventoryItem,
      category: gearCategory,
    };
    expect(transform(input)).toEqual({
      id: gearInventoryItem.id,
      name: gearInventoryItem.name,
      quantity: gearInventoryItem.quantity,
      category: {
        id: gearCategory.id,
        name: gearCategory.name,
        public: gearCategory.public,
      },
    });
  });
});
