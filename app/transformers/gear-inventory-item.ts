import type {
  GearCategory,
  GearInventoryItem,
} from "../../generated/prisma/client";

type ClientGearInventoryItem = Pick<
  GearInventoryItem,
  "id" | "name" | "quantity"
> & { category: Pick<GearCategory, "id" | "name"> };

export function transform(
  item: GearInventoryItem & { category: GearCategory },
): ClientGearInventoryItem {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    category: {
      id: item.category.id,
      name: item.category.name,
    },
  };
}
