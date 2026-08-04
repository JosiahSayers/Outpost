import { gearStateFor } from "$/frontend/utils/api/gear-assignment";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { describe, expect, it } from "bun:test";

function gear(
  overrides: Partial<ClientGearInventoryItem> = {},
): ClientGearInventoryItem {
  return {
    id: "gear-1",
    name: "Copper Spur UL2",
    quantity: 1,
    grams: 690,
    category: { id: "cat-1", name: "Shelter", public: false },
    ...overrides,
  };
}

function item(
  overrides: Partial<ClientPackingListItem> = {},
): ClientPackingListItem {
  return {
    id: "item-1",
    name: "Tent",
    optional: false,
    quantity: 1,
    sortPosition: 1,
    trackGearAssignment: true,
    assignedGear: null,
    ...overrides,
  };
}

describe("gearStateFor", () => {
  it("is assigned when the item has gear, regardless of the tracking flag", () => {
    expect(gearStateFor(item({ assignedGear: gear() }))).toBe("assigned");
    expect(
      gearStateFor(item({ assignedGear: gear(), trackGearAssignment: false })),
    ).toBe("assigned");
  });

  it("is untracked when dismissed and no gear is assigned", () => {
    expect(gearStateFor(item({ trackGearAssignment: false }))).toBe(
      "untracked",
    );
  });

  it("is undecided when nothing has been chosen yet", () => {
    expect(gearStateFor(item({ trackGearAssignment: true }))).toBe("undecided");
  });
});
