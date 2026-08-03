import { describe, expect, it } from "bun:test";
import { transform } from "$/transformers/trip-packing-list";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the expected shape", () => {
    const packingList = make("PackingList");
    const tripPackingList = make("TripPackingList", {
      packingListId: packingList.id,
    });
    const section = make("PackingListSection", {
      packingListId: packingList.id,
    });
    const gearCategory = make("GearCategory");
    const gearInventoryItem = make("GearInventoryItem", {
      gearCategoryId: gearCategory.id,
    });
    const item = {
      ...make("PackingListItem", { packingListSectionId: section.id }),
      assignedGear: { ...gearInventoryItem, category: gearCategory },
    };
    const status = make("TripPackingListItemStatus", {
      tripPackingListId: tripPackingList.id,
      packingListItemId: item.id,
      packed: true,
      notNeeded: false,
    });

    expect(
      transform({
        ...tripPackingList,
        packingList: {
          ...packingList,
          packingListSections: [
            {
              ...section,
              items: [{ ...item, tripPackingListItemStatuses: [status] }],
            },
          ],
        },
      }),
    ).toEqual({
      id: tripPackingList.id,
      tripId: tripPackingList.tripId,
      packingListId: tripPackingList.packingListId,
      name: packingList.name,
      sections: [
        {
          id: section.id,
          name: section.name,
          sortPosition: section.sortPosition,
          items: [
            {
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
              status: {
                packed: true,
                notNeeded: false,
              },
            },
          ],
        },
      ],
    });
  });

  it("returns an empty sections array when the packing list has no sections", () => {
    const packingList = make("PackingList");
    const tripPackingList = make("TripPackingList", {
      packingListId: packingList.id,
    });

    expect(
      transform({
        ...tripPackingList,
        packingList: { ...packingList, packingListSections: [] },
      }),
    ).toMatchObject({
      sections: [],
    });
  });
});
