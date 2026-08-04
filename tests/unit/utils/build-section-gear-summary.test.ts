import { resetGearTrackedMock } from "$/frontend/utils/api/gear-assignment";
import { buildSectionGearSummary } from "$/frontend/utils/build-section-gear-summary";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";
import type { ClientPackingListItem } from "$/transformers/packing-list-item";
import { beforeEach, describe, expect, it } from "bun:test";

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

beforeEach(() => resetGearTrackedMock());

describe("buildSectionGearSummary", () => {
  it("counts every item as trackable while nothing is decided", () => {
    const summary = buildSectionGearSummary(
      [item({ id: "a" }), item({ id: "b" })],
      {},
    );

    expect(summary).toMatchObject({
      assigned: 0,
      undecided: 2,
      trackable: 2,
      settled: false,
      grams: 0,
    });
  });

  it("drops dismissed items out of the denominator rather than the numerator", () => {
    const summary = buildSectionGearSummary(
      [item({ id: "a", assignedGear: gear() }), item({ id: "b" })],
      { b: false },
    );

    expect(summary).toMatchObject({
      assigned: 1,
      undecided: 0,
      trackable: 1,
      settled: true,
    });
  });

  it("multiplies gear weight by the packing list quantity", () => {
    const summary = buildSectionGearSummary(
      [item({ id: "a", quantity: 3, assignedGear: gear({ grams: 100 }) })],
      {},
    );

    expect(summary.grams).toBe(300);
  });

  it("treats gear with no recorded weight as weightless but still assigned", () => {
    const summary = buildSectionGearSummary(
      [item({ id: "a", assignedGear: gear({ grams: null }) })],
      {},
    );

    expect(summary.assigned).toBe(1);
    expect(summary.grams).toBe(0);
  });

  it("is settled once nothing is left undecided", () => {
    const summary = buildSectionGearSummary(
      [item({ id: "a", assignedGear: gear() }), item({ id: "b" })],
      {},
    );

    expect(summary.settled).toBe(false);
  });

  it("reports a section where every item was dismissed as having nothing to track", () => {
    const summary = buildSectionGearSummary([item({ id: "a" })], { a: false });

    expect(summary).toMatchObject({
      assigned: 0,
      undecided: 0,
      trackable: 0,
      settled: true,
    });
  });
});
