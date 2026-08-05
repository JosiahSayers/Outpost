import {
  buildPackingListGearTotals,
  buildSectionGearSummary,
} from "$/frontend/utils/build-section-gear-summary";
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
    category: null,
    ...overrides,
  };
}

describe("buildSectionGearSummary", () => {
  it("counts every item as trackable while nothing is decided", () => {
    const summary = buildSectionGearSummary([
      item({ id: "a" }),
      item({ id: "b" }),
    ]);

    expect(summary).toMatchObject({
      assigned: 0,
      undecided: 2,
      trackable: 2,
      settled: false,
      grams: 0,
    });
  });

  it("drops dismissed items out of the denominator rather than the numerator", () => {
    const summary = buildSectionGearSummary([
      item({ id: "a", assignedGear: gear() }),
      item({ id: "b", trackGearAssignment: false }),
    ]);

    expect(summary).toMatchObject({
      assigned: 1,
      undecided: 0,
      trackable: 1,
      settled: true,
    });
  });

  it("multiplies gear weight by the packing list quantity", () => {
    const summary = buildSectionGearSummary([
      item({ id: "a", quantity: 3, assignedGear: gear({ grams: 100 }) }),
    ]);

    expect(summary.grams).toBe(300);
  });

  it("treats gear with no recorded weight as weightless but still assigned", () => {
    const summary = buildSectionGearSummary([
      item({ id: "a", assignedGear: gear({ grams: null }) }),
    ]);

    expect(summary.assigned).toBe(1);
    expect(summary.grams).toBe(0);
  });

  it("is settled once nothing is left undecided", () => {
    const summary = buildSectionGearSummary([
      item({ id: "a", assignedGear: gear() }),
      item({ id: "b" }),
    ]);

    expect(summary.settled).toBe(false);
  });

  it("reports a section where every item was dismissed as having nothing to track", () => {
    const summary = buildSectionGearSummary([
      item({ id: "a", trackGearAssignment: false }),
    ]);

    expect(summary).toMatchObject({
      assigned: 0,
      undecided: 0,
      trackable: 0,
      settled: true,
    });
  });
});

describe("buildPackingListGearTotals", () => {
  it("counts every item's quantity, regardless of gear-tracking state", () => {
    const totals = buildPackingListGearTotals([
      item({ id: "a", quantity: 2 }),
      item({ id: "b", quantity: 3, trackGearAssignment: false }),
    ]);

    expect(totals.totalItems).toBe(5);
  });

  it("multiplies assigned gear weight by quantity across the whole list", () => {
    const totals = buildPackingListGearTotals([
      item({ id: "a", quantity: 2, assignedGear: gear({ grams: 100 }) }),
      item({ id: "b", quantity: 1, assignedGear: gear({ grams: 50 }) }),
    ]);

    expect(totals.totalGrams).toBe(250);
  });

  it("excludes items with no assigned gear from the weight total", () => {
    const totals = buildPackingListGearTotals([
      item({ id: "a", quantity: 1 }),
      item({ id: "b", quantity: 1, trackGearAssignment: false }),
    ]);

    expect(totals.totalGrams).toBe(0);
  });
});
