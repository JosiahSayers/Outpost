// Fake data standing in for packing lists — they're real, but aren't
// assignable to a trip yet, so the list of lists here is still fake. Swap
// this out once that assignment exists. The per-item `notNeeded` flag is a
// trip-scoped override with no backing API yet either: it lives here as a
// client-only mock of "not needed for this trip" without touching the
// reusable list template itself.

export interface PlaceholderPackingItem {
  id: string;
  name: string;
  packed: boolean;
  notNeeded: boolean;
}

export interface PlaceholderPackingCategory {
  name: string;
  items: PlaceholderPackingItem[];
}

export interface PlaceholderPackingList {
  id: number;
  name: string;
  categories: PlaceholderPackingCategory[];
}

interface RawItem {
  name: string;
  packed: boolean;
  notNeeded?: boolean;
}

const rawLists: Array<{
  id: number;
  name: string;
  categories: Array<{ name: string; items: RawItem[] }>;
}> = [
  {
    id: 101,
    name: "Wonderland Backpacking Kit",
    categories: [
      {
        name: "Shelter",
        items: [
          { name: "Tent body", packed: true },
          { name: "Tent poles", packed: true },
          { name: "Rainfly", packed: true },
          { name: "Stakes (8x)", packed: false },
        ],
      },
      {
        name: "Sleep System",
        items: [
          { name: "Sleeping bag", packed: true },
          { name: "Sleeping pad", packed: true },
          { name: "Pillow", packed: false },
          { name: "Liner", packed: false },
        ],
      },
      {
        name: "Clothing",
        items: [
          { name: "Rain jacket", packed: true },
          { name: "Fleece", packed: true },
          { name: "Base layer top", packed: true },
          { name: "Base layer bottom", packed: true },
          { name: "Hiking socks (3 pr)", packed: true },
          { name: "Camp shoes", packed: false },
          { name: "Sun hat", packed: false },
          { name: "Gloves", packed: false, notNeeded: true },
        ],
      },
      {
        name: "Cook",
        items: [
          { name: "Stove", packed: true },
          { name: "Fuel canister", packed: true },
          { name: "Pot", packed: true },
          { name: "Spork", packed: false },
          { name: "Lighter", packed: false },
        ],
      },
      {
        name: "Personal",
        items: [
          { name: "Headlamp", packed: true },
          { name: "Sunscreen", packed: true },
          { name: "Toothbrush", packed: true },
          { name: "First aid kit", packed: false },
          { name: "Toilet paper", packed: false },
          { name: "Hand sanitizer", packed: false },
        ],
      },
      {
        name: "Safety & Nav",
        items: [
          { name: "Map", packed: true },
          { name: "Compass", packed: false },
          { name: "Whistle", packed: false },
        ],
      },
      {
        name: "Misc",
        items: [
          { name: "Trekking poles", packed: true },
          { name: "Trash bags", packed: false },
        ],
      },
    ],
  },
  {
    id: 102,
    name: "Cook & Food Kit",
    categories: [
      {
        name: "Food",
        items: [
          { name: "Stove", packed: true },
          { name: "Fuel canister", packed: true },
          { name: "Pot set", packed: true },
          { name: "Bowls (2x)", packed: true },
          { name: "Sporks (2x)", packed: true },
          { name: "Cutting board", packed: true },
          { name: "Dehydrated dinners (4x)", packed: true },
          { name: "Coffee filters", packed: true },
          { name: "Trail mix", packed: true },
          { name: "Salt & pepper", packed: true },
          { name: "Dish soap", packed: true },
          { name: "Sponge", packed: true },
        ],
      },
    ],
  },
];

export const placeholderPackingLists: PlaceholderPackingList[] = rawLists.map(
  (list) => ({
    id: list.id,
    name: list.name,
    categories: list.categories.map((category) => ({
      name: category.name,
      items: category.items.map((item) => ({
        id: `${list.id}-${category.name}-${item.name}`,
        name: item.name,
        packed: item.packed,
        notNeeded: item.notNeeded ?? false,
      })),
    })),
  }),
);

export interface MergedPackingCategory {
  name: string;
  items: Array<PlaceholderPackingItem & { listId: number; listName: string }>;
}

// Merges same-named categories across every list assigned to the trip, so
// "Shelter" gear from two different lists shows up as one group.
export function mergeCategories(
  lists: PlaceholderPackingList[],
): MergedPackingCategory[] {
  const byName = new Map<string, MergedPackingCategory>();
  for (const list of lists) {
    for (const category of list.categories) {
      const items = category.items.map((item) => ({
        ...item,
        listId: list.id,
        listName: list.name,
      }));
      const existing = byName.get(category.name);
      if (existing) existing.items.push(...items);
      else byName.set(category.name, { name: category.name, items });
    }
  }
  return Array.from(byName.values());
}

// Items marked `notNeeded` drop out of both the numerator and denominator,
// rather than counting as outstanding or packed.
export function packingCompletion(lists: PlaceholderPackingList[]) {
  let total = 0;
  let packed = 0;
  for (const list of lists) {
    for (const category of list.categories) {
      for (const item of category.items) {
        if (item.notNeeded) continue;
        total++;
        if (item.packed) packed++;
      }
    }
  }
  return { packed, total };
}
