import type { MealName } from "../../../../generated/prisma/client";
import type {
  PackingListSectionInput,
  PackingListSectionItemInput,
} from "../packing-list-generator";
import { formatDayLabel } from "./shared";

export interface FoodSectionItem {
  meal: MealName;
  name: string;
  quantity: number;
  purchased: boolean;
  packed: boolean;
}

export interface FoodSectionDay {
  dayNumber: number;
  date: Date | null;
  items: FoodSectionItem[];
}

const MEAL_LABEL: Record<MealName, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

// Each day becomes an ordinary section fed into the same 3-column packing
// list engine as gear categories (packing-list-generator.ts), reusing its
// title/overflow/continuation handling instead of maintaining a second,
// parallel single-column layout. sortPosition is offset well past any
// realistic gear category so food always sorts after gear, in day order.
export function foodDaysToSections(
  days: FoodSectionDay[],
): PackingListSectionInput[] {
  return days
    .slice()
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .filter((day) => day.items.length > 0)
    .map((day, index) => ({
      name: `Food — ${formatDayLabel(day)}`,
      sortPosition: 1000 + index,
      checkboxLegend: "Bought · Packed",
      items: day.items.map((item, itemIndex): PackingListSectionItemInput => ({
        name: `${item.name} · ${MEAL_LABEL[item.meal]}`,
        quantity: item.quantity,
        optional: false,
        sortPosition: itemIndex,
        assignedGear: null,
        foodStatus: { purchased: item.purchased, packed: item.packed },
      })),
    }));
}
