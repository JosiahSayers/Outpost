import { describe, expect, it } from "bun:test";
import { transform } from "$/transformers/trip-packing-list/item";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the packing list item fields plus the status", () => {
    const item = {
      ...make("PackingListItem"),
      assignedGear: null,
      category: null,
    };
    const status = make("TripPackingListItemStatus", {
      packed: true,
      notNeeded: false,
    });

    expect(
      transform({ ...item, tripPackingListItemStatuses: [status] }),
    ).toEqual({
      id: item.id,
      name: item.name,
      optional: item.optional,
      quantity: item.quantity,
      sortPosition: item.sortPosition,
      trackGearAssignment: item.trackGearAssignment,
      assignedGear: null,
      category: null,
      status: {
        packed: true,
        notNeeded: false,
      },
    });
  });

  it("defaults packed and notNeeded to false when there is no status", () => {
    const item = {
      ...make("PackingListItem"),
      assignedGear: null,
      category: null,
    };

    expect(
      transform({ ...item, tripPackingListItemStatuses: [] }),
    ).toMatchObject({
      status: {
        packed: false,
        notNeeded: false,
      },
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
      category: null,
    };
    const status = make("TripPackingListItemStatus", {
      packed: true,
      notNeeded: false,
    });

    expect(
      transform({ ...item, tripPackingListItemStatuses: [status] }),
    ).toEqual({
      id: item.id,
      name: item.name,
      optional: item.optional,
      quantity: item.quantity,
      sortPosition: item.sortPosition,
      trackGearAssignment: item.trackGearAssignment,
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
      category: null,
      status: {
        packed: true,
        notNeeded: false,
      },
    });
  });
});
