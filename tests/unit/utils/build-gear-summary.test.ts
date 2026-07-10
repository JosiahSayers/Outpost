import { buildGearSummary } from "$/frontend/utils/build-gear-summary";
import { transformers } from "$/transformers";
import { expect, it } from "bun:test";
import { make } from "../../helpers/test-data/make";

function makeItem(categoryId: number, quantity: number, grams: number | null) {
  const item = make("GearInventoryItem", {
    quantity,
    grams,
    gearCategoryId: categoryId,
  });
  return transformers.gearInventoryItem({
    ...item,
    category: make("GearCategory", { id: categoryId }),
  });
}

it("sums quantities across all items for totalItems", () => {
  const items = [makeItem(1, 2, 100), makeItem(1, 3, 200)];
  expect(buildGearSummary(items).totalItems).toBe(5);
});

it("calculates total weight as the sum of (grams * quantity)", () => {
  // 2*1000 + 1*800 + 3*200 = 3400
  const items = [
    makeItem(1, 2, 1000),
    makeItem(1, 1, 800),
    makeItem(2, 3, 200),
  ];
  expect(buildGearSummary(items).totalGrams).toBe(3400);
});

it("counts unique category IDs for categoryCount", () => {
  const items = [makeItem(1, 1, 100), makeItem(1, 1, 100), makeItem(2, 1, 100)];
  expect(buildGearSummary(items).categoryCount).toBe(2);
});

it("treats null grams as zero when calculating weight", () => {
  const items = [makeItem(1, 1, null), makeItem(1, 1, 500)];
  expect(buildGearSummary(items).totalGrams).toBe(500);
});

it("returns zeros for an empty item list", () => {
  expect(buildGearSummary([])).toEqual({
    totalItems: 0,
    totalGrams: 0,
    categoryCount: 0,
  });
});
