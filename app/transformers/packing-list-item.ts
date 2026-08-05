import {
  transform as gearInventoryItemTransform,
  type ClientGearInventoryItem,
} from "$/transformers/gear-inventory-item";
import {
  transform as gearCategoryTransform,
  type ClientGearCategory,
} from "$/transformers/gear-category";
import type {
  GearCategory,
  GearInventoryItem,
  PackingListItem,
} from "../../generated/prisma/browser";

export type ClientPackingListItem = Pick<
  PackingListItem,
  | "id"
  | "name"
  | "optional"
  | "quantity"
  | "sortPosition"
  | "trackGearAssignment"
> & {
  assignedGear: ClientGearInventoryItem | null;
  category: ClientGearCategory | null;
};

export type PackingListItemTransformerInput = PackingListItem & {
  assignedGear: (GearInventoryItem & { category: GearCategory }) | null;
  category: GearCategory | null;
};

export function transform(
  item: PackingListItemTransformerInput,
): ClientPackingListItem {
  return {
    id: item.id,
    name: item.name,
    optional: item.optional,
    quantity: item.quantity,
    sortPosition: item.sortPosition,
    trackGearAssignment: item.trackGearAssignment,
    assignedGear: item.assignedGear
      ? gearInventoryItemTransform(item.assignedGear)
      : null,
    category: item.category ? gearCategoryTransform(item.category) : null,
  };
}
