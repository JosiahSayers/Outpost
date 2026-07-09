import type { ClientMealPlanDay } from "$/transformers/meal-plan/day";
import type { ClientMealPlanItem } from "$/transformers/meal-plan/item";

/**
 * Returns a new array of meal plan days sorted by day number ascending, with
 * the items inside each meal sorted by name (id as a tiebreaker so equal
 * names keep a stable order).
 *
 * The backend does not guarantee any ordering in its responses, so every
 * render path that displays the meal plan must sort with this before
 * rendering.
 */
export function sortMealPlan(days: ClientMealPlanDay[]): ClientMealPlanDay[] {
  return [...days]
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((day) => ({
      ...day,
      meals: Object.fromEntries(
        Object.entries(day.meals).map(([meal, items]) => [
          meal,
          sortItems(items),
        ]),
      ) as ClientMealPlanDay["meals"],
    }));
}

function sortItems(items: ClientMealPlanItem[]): ClientMealPlanItem[] {
  return [...items].sort(
    (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
  );
}
