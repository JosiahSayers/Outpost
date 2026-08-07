export function paginate<
  RawItem,
  ClientItem,
  const ItemKey extends string = "items",
>(
  items: RawItem[],
  transform: (item: RawItem) => ClientItem,
  total: number,
  pageSize: number,
  itemKey?: ItemKey,
): Record<ItemKey, ClientItem[]> & { total: number; pageSize: number };
export function paginate<RawItem, ClientItem>(
  items: RawItem[],
  transform: (item: RawItem) => ClientItem,
  total: number,
  pageSize: number,
  itemKey = "items",
): any {
  return {
    [itemKey]: items.map(transform),
    total,
    pageSize,
  };
}
