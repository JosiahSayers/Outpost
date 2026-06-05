import { transform as gearCategoryTransform } from "$/transformers/gear-category";
import { transform as gearInventoryItemTransform } from "$/transformers/gear-inventory-item";
import { transform as packingListTransform } from "$/transformers/packing-list";
import { transform as packingListSectionTransform } from "$/transformers/packing-list-section";
import { transform as packingListItemTransform } from "$/transformers/packing-list-item";

export const transformers = {
  gearCategory: gearCategoryTransform,
  gearInventoryItem: gearInventoryItemTransform,
  packingList: packingListTransform,
  packingListSection: packingListSectionTransform,
  packingListItem: packingListItemTransform,
} as const;
