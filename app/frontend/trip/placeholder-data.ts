// Fake data standing in for links — the feature doesn't exist in the backend
// yet. Packing lists are real, but aren't assignable to a trip yet either, so
// the list of lists here is still fake. Swap each of these out as its backing
// feature gets built.

export interface PlaceholderPackingList {
  id: number;
  name: string;
  totalItems: number;
  packedItems: number;
}

export interface PlaceholderLink {
  id: string;
  label: string;
  source: string;
  url: string;
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

export const placeholderLinks: PlaceholderLink[] = [
  {
    id: "l1",
    label: "Wonderland Trail Full Loop",
    source: "AllTrails",
    url: "https://alltrails.com",
  },
  {
    id: "l2",
    label: "Wonderland Trail GPX + permit zones",
    source: "onX Backcountry",
    url: "https://onxmaps.com",
  },
  {
    id: "l3",
    label: "Mount Rainier Wilderness Trip Planner",
    source: "NPS.gov",
    url: "https://nps.gov",
  },
  {
    id: "l4",
    label: "Wonderland Trail Permit",
    source: "Recreation.gov",
    url: "https://recreation.gov",
  },
];

export function packingCompletion(lists: PlaceholderPackingList[]) {
  const packed = lists.reduce((sum, l) => sum + l.packedItems, 0);
  const total = lists.reduce((sum, l) => sum + l.totalItems, 0);
  return { packed, total };
}
