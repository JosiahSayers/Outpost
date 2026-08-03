import {
  transform as gearInventoryItemTransform,
  type ClientGearInventoryItem,
} from "$/transformers/gear-inventory-item";
import type {
  GearCategory,
  GearInventoryItem,
  PackingListItem,
} from "../../generated/prisma/browser";

export type ClientPackingListItem = Pick<
  PackingListItem,
  "id" | "name" | "optional" | "quantity" | "sortPosition"
> & { assignedGear: ClientGearInventoryItem | null };

export type PackingListItemTransformerInput = PackingListItem & {
  assignedGear: (GearInventoryItem & { category: GearCategory }) | null;
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
    assignedGear: item.assignedGear
      ? gearInventoryItemTransform(item.assignedGear)
      : null,
  };
}
