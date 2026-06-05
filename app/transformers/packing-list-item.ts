import type { PackingListItem } from "../../generated/prisma/browser";

export type ClientPackingListItem = Pick<
  PackingListItem,
  "id" | "name" | "optional" | "quantity" | "sortPosition"
>;

export function transform(item: PackingListItem): ClientPackingListItem {
  return {
    id: item.id,
    name: item.name,
    optional: item.optional,
    quantity: item.quantity,
    sortPosition: item.sortPosition,
  };
}
