export interface PaginatedResult<T> {
  items: T[];
  total: number;
  pageSize: number;
}

export function paginate<RawItem, ClientItem>(
  items: RawItem[],
  transform: (item: RawItem) => ClientItem,
  total: number,
  pageSize: number,
): PaginatedResult<ClientItem> {
  return {
    items: items.map(transform),
    total,
    pageSize,
  };
}
