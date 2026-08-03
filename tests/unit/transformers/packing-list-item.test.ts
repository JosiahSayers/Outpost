import { describe, expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";
import { transformers } from "$/transformers";

describe("transform", () => {
  it("returns the expected shape", () => {
    const item = { ...make("PackingListItem"), assignedGear: null };
    expect(transformers.packingListItem(item)).toEqual({
      id: item.id,
      name: item.name,
      optional: item.optional,
      quantity: item.quantity,
      sortPosition: item.sortPosition,
      assignedGear: null,
    });
  });

  it("transforms the assigned gear when one is present", () => {
    const gearCategory = make("GearCategory");
    const gearInventoryItem = make("GearInventoryItem", {
      gearCategoryId: gearCategory.id,
    });
    const item = {
      ...make("PackingListItem"),
      assignedGear: { ...gearInventoryItem, category: gearCategory },
    };

    expect(transformers.packingListItem(item)).toEqual({
      id: item.id,
      name: item.name,
      optional: item.optional,
      quantity: item.quantity,
      sortPosition: item.sortPosition,
      assignedGear: {
        id: gearInventoryItem.id,
        name: gearInventoryItem.name,
        quantity: gearInventoryItem.quantity,
        grams: gearInventoryItem.grams,
        category: {
          id: gearCategory.id,
          name: gearCategory.name,
          public: gearCategory.public,
        },
      },
    });
  });
});
