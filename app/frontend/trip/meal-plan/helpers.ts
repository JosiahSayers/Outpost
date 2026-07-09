import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";
import type { MealName } from "../../../../generated/prisma/enums";

export const MEAL_ORDER: MealName[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snacks",
];

export const MEAL_LABEL: Record<MealName, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snacks: "Snacks",
};

// Meal plan dates are calendar days, not instants, so they're formatted in
// UTC (the timezone they were stored in) rather than the viewer's local
// timezone, which could otherwise roll a UTC-midnight timestamp back to the
// previous day.
export function formatMealDate(date: string | null): string | null {
  if (!date) return null;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function mealItemsSummary(items: ClientMealPlanItem[]): string | null {
  if (items.length === 0) return null;
  return items
    .map((item) =>
      item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name,
    )
    .join(", ");
}
