import type { GearSummary } from "$/frontend/dashboard/types";
import type { ClientGearInventoryItem } from "$/transformers/gear-inventory-item";

export function buildGearSummary(
  items: ClientGearInventoryItem[],
): GearSummary {
  return {
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalGrams: items.reduce(
      (sum, item) => sum + (item.grams ?? 0) * item.quantity,
      0,
    ),
    categoryCount: new Set(items.map((i) => i.category.id)).size,
  };
}
