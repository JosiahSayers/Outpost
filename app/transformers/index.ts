import { transform as gearCategoryTransform } from "$/transformers/gear-category";
import { transform as gearInventoryItemTransform } from "$/transformers/gear-inventory-item";

export const transformers = {
  gearCategory: gearCategoryTransform,
  gearInventoryItem: gearInventoryItemTransform,
} as const;
