import { transformers } from "$/transformers";
import { type ClientGearCategory } from "$/transformers/gear-category";
import type {
  GearCategory,
  GearInventoryItem,
} from "../../generated/prisma/client";

export type ClientGearInventoryItem = Pick<
  GearInventoryItem,
  "id" | "name" | "quantity" | "grams"
> & { category: ClientGearCategory };

export function transform(
  item: GearInventoryItem & { category: GearCategory },
): ClientGearInventoryItem {
  return {
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    grams: item.grams,
    category: transformers.gearCategory(item.category),
  };
}
