// Fake data standing in for trip tasks, meal plans, and links — none of
// these features exist in the backend yet. Packing lists are real, but
// aren't assignable to a trip yet either, so the list of lists here is
// still fake. Swap each of these out as its backing feature gets built.

export type TaskPhase = "before" | "during" | "after";

export interface PlaceholderTask {
  id: string;
  label: string;
  phase: TaskPhase;
  done: boolean;
  dueDate?: string;
}

export interface PlaceholderPackingList {
  id: number;
  name: string;
  totalItems: number;
  packedItems: number;
}

export interface PlaceholderMeal {
  day: string;
  date: string;
  breakfast?: string;
  lunch?: string;
  dinner?: string;
}

export interface PlaceholderLink {
  id: string;
  label: string;
  source: string;
  url: string;
}

export const placeholderTasks: PlaceholderTask[] = [
  {
    id: "t1",
    label: "Reserve backcountry permit",
    phase: "before",
    done: true,
  },
  { id: "t2", label: "Buy fuel canisters", phase: "before", done: true },
  {
    id: "t3",
    label: "Download offline maps",
    phase: "before",
    done: false,
    dueDate: "Aug 10",
  },
  {
    id: "t4",
    label: "Check weather forecast",
    phase: "before",
    done: false,
    dueDate: "Aug 13",
  },
  {
    id: "t5",
    label: "Share itinerary with emergency contact",
    phase: "before",
    done: false,
    dueDate: "Aug 13",
  },
  {
    id: "t6",
    label: "Check in at ranger station (Mile 0)",
    phase: "during",
    done: false,
  },
  {
    id: "t7",
    label: "Resupply at Sunrise camp",
    phase: "during",
    done: false,
  },
  {
    id: "t8",
    label: "Return rental bear canister",
    phase: "after",
    done: false,
    dueDate: "Aug 21",
  },
  { id: "t9", label: "Post trip report", phase: "after", done: false },
];

export const placeholderPackingLists: PlaceholderPackingList[] = [
  {
    id: 101,
    name: "Wonderland Backpacking Kit",
    totalItems: 32,
    packedItems: 18,
  },
  { id: 102, name: "Cook & Food Kit", totalItems: 12, packedItems: 12 },
];

export const placeholderMealPlan: PlaceholderMeal[] = [
  { day: "Day 1", date: "Aug 14", dinner: "Backpacker's Pantry Pad Thai" },
  {
    day: "Day 2",
    date: "Aug 15",
    breakfast: "Oatmeal + coffee",
    lunch: "Tortilla wraps",
    dinner: "Freeze-dried chili",
  },
  {
    day: "Day 3",
    date: "Aug 16",
    breakfast: "Granola",
    lunch: "Summit sausage & cheese",
    dinner: "Ramen bomb",
  },
  {
    day: "Day 4",
    date: "Aug 17",
    breakfast: "Oatmeal + coffee",
    lunch: "Tortilla wraps",
    dinner: "Mac & cheese",
  },
  { day: "Day 5", date: "Aug 18", breakfast: "Bars (hike out)" },
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

export function taskCompletion(tasks: PlaceholderTask[]) {
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length };
}

export function packingCompletion(lists: PlaceholderPackingList[]) {
  const packed = lists.reduce((sum, l) => sum + l.packedItems, 0);
  const total = lists.reduce((sum, l) => sum + l.totalItems, 0);
  return { packed, total };
}
