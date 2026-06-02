import type {
  GearCategory,
  GearInventoryItem,
} from "../../generated/prisma/client";
import { type ClientGeatCategory } from "$/transformers/gear-category";
import { transformers } from "$/transformers";

export type ClientGearInventoryItem = Pick<
  GearInventoryItem,
  "id" | "name" | "quantity"
> & { category: ClientGeatCategory };

export function transform(
  item: GearInventoryItem & { category: GearCategory },
): ClientGearInventoryItem {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    category: transformers.gearCategory(item.category),
  };
}
