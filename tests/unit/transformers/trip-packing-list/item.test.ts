import { describe, expect, it } from "bun:test";
import { transform } from "$/transformers/trip-packing-list/item";
import { make } from "../../../helpers/test-data/make";

describe("transform", () => {
  it("returns the packing list item fields plus the status", () => {
    const item = make("PackingListItem");
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
      status: {
        packed: true,
        notNeeded: false,
      },
    });
  });

  it("defaults packed and notNeeded to false when there is no status", () => {
    const item = make("PackingListItem");

    expect(
      transform({ ...item, tripPackingListItemStatuses: [] }),
    ).toMatchObject({
      status: {
        packed: false,
        notNeeded: false,
      },
    });
  });
});
