// Fake data standing in for packing lists — they're real, but aren't
// assignable to a trip yet, so the list of lists here is still fake. Swap
// this out once that assignment exists.

export interface PlaceholderPackingList {
  id: number;
  name: string;
  totalItems: number;
  packedItems: number;
}

export const placeholderPackingLists: PlaceholderPackingList[] = [
  {
    id: 101,
    name: "Wonderland Backpacking Kit",
    totalItems: 32,
    packedItems: 18,
  },
  { id: 102, name: "Cook & Food Kit", totalItems: 12, packedItems: 12 },
];

export function packingCompletion(lists: PlaceholderPackingList[]) {
  const packed = lists.reduce((sum, l) => sum + l.packedItems, 0);
  const total = lists.reduce((sum, l) => sum + l.totalItems, 0);
  return { packed, total };
}
