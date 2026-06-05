import type { PackingListSection } from "../../generated/prisma/browser";

export type ClientPackingListSection = Pick<
  PackingListSection,
  "id" | "name" | "sortPosition"
>;

export function transform(item: PackingListSection): ClientPackingListSection {
  return {
    id: item.id,
    name: item.name,
    sortPosition: item.sortPosition,
  };
}
