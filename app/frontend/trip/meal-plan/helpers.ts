import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
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

// Values for a day appended to the end of the meal plan: one past the
// highest existing day number, dated one day after that day. When the plan
// is empty or the last day has no date, the date is derived from the trip
// start instead (start + dayNumber - 1), and is null if the trip has no
// start date either.
export function nextMealPlanDay(
  mealPlan: ClientMealPlanDay[],
  tripStart: string | null,
): { dayNumber: number; date: string | null } {
  if (mealPlan.length === 0) {
    return { dayNumber: 1, date: tripStart };
  }

  const lastDay = mealPlan.reduce((max, day) =>
    day.dayNumber > max.dayNumber ? day : max,
  );
  const dayNumber = lastDay.dayNumber + 1;

  let date: string | null = null;
  if (lastDay.date) {
    date = addUtcDays(lastDay.date, 1);
  } else if (tripStart) {
    date = addUtcDays(tripStart, dayNumber - 1);
  }

  return { dayNumber, date };
}

// Like formatMealDate, treats the date-only string as a UTC calendar day.
function addUtcDays(date: string, days: number): string {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function itemTotalCalories(item: ClientMealPlanItem): number {
  return item.calories * item.quantity;
}

export function mealCalories(items: ClientMealPlanItem[]): number {
  return items.reduce((sum, item) => sum + itemTotalCalories(item), 0);
}

export function dayCalories(day: ClientMealPlanDay): number {
  return MEAL_ORDER.reduce(
    (sum, meal) => sum + mealCalories(day.meals[meal]),
    0,
  );
}

export function formatCalories(calories: number): string {
  return `${calories.toLocaleString("en-US")} cal`;
}

// Calories of 0 are treated as "not tracked" and render nothing. For items
// with a quantity, both the per-instance and total counts are shown.
export function itemCaloriesSummary(item: ClientMealPlanItem): string | null {
  if (item.calories === 0) return null;
  if (item.quantity > 1) {
    return `${item.calories.toLocaleString("en-US")} cal each · ${itemTotalCalories(
      item,
    ).toLocaleString("en-US")} total`;
  }
  return formatCalories(item.calories);
}

export function mealItemsSummary(items: ClientMealPlanItem[]): string | null {
  if (items.length === 0) return null;
  return items
    .map((item) =>
      item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name,
    )
    .join(", ");
}
