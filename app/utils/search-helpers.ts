import { db } from "$/utils/db";
import type { MealName } from "../../generated/prisma/enums";

// Turn free-text input into a prefix-match tsquery: each whitespace-delimited
// token becomes a `token:*` prefix term, all required (`&`). Mirrors
// searchCategories. Returns "" for blank input so callers can short-circuit.
function toPrefixTsQuery(searchQuery: string): string {
  return searchQuery
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word}:*`)
    .join(" & ");
}

export interface SearchPlacesOptions {
  state?: string;
  limit?: number;
  // Include low-value results (backpackingTier 0: closed access, private parks,
  // private/NGO easements). Off by default -- they're filtered out entirely.
  includeLowValue?: boolean;
}

// Full-text autocomplete over canonical Place rows. Ranked backpacking-first:
// higher backpackingTier wins, then text relevance (ts_rank), then largest
// acreage, then name. So "Manistee National Forest" beats "Manistee Fairgrounds"
// for the same query. Optional state filter applied in-query; tier-0 rows are
// excluded unless includeLowValue is set (in which case they sort to the bottom).
// Two-step like searchCategories: rank ids in SQL, then hydrate -- but we
// preserve the ranked order on the way out.
export async function searchPlaces(
  searchQuery: string,
  { state, limit = 20, includeLowValue = false }: SearchPlacesOptions = {},
) {
  const formattedQuery = toPrefixTsQuery(searchQuery);
  if (!formattedQuery) return [];

  const stateParam = state ?? null;

  const results = await db.$queryRaw<Array<{ id: string }>>`
SELECT "Place".id
  FROM "Place"
  WHERE "Place".data_fts @@ to_tsquery('english', ${formattedQuery})
    AND (${stateParam}::text IS NULL OR "Place".state = ${stateParam})
    AND (${includeLowValue}::boolean OR "Place"."backpackingTier" > 0)
  ORDER BY "Place"."backpackingTier" DESC,
           ts_rank("Place".data_fts, to_tsquery('english', ${formattedQuery})) DESC,
           "Place".acres DESC NULLS LAST,
           "Place".name ASC
  LIMIT ${limit};
`;

  const rankedIds = results.map((result) => result.id);
  const places = await db.place.findMany({ where: { id: { in: rankedIds } } });
  const placesById = new Map(places.map((place) => [place.id, place]));

  return rankedIds
    .map((id) => placesById.get(id))
    .filter((place) => place !== undefined);
}

export interface SearchMealPlanItemsOptions {
  // Exclude items belonging to this trip (typically the trip being edited),
  // so "previous trips" doesn't just echo items already on the current one.
  excludeTripId?: string;
  // Boost rows whose meal matches this one, so e.g. searching from a
  // breakfast slot surfaces the user's past breakfasts first. Rows with a
  // different (or no) matching meal are still returned, just ranked lower.
  meal?: MealName;
  limit?: number;
}

// Full-text autocomplete over a user's own previous MealPlanItem rows (BTP-77:
// autocomplete meals from previous trips). Scoped to the requesting user via
// MealPlanDay -> Trip, since MealPlanItem has no direct userId. Deduped by
// exact name match first (DISTINCT ON, keeping the most recently created row
// per name) so e.g. "Oatmeal" added on two different trips only shows up
// once. The deduped rows are then ranked by meal match, then text relevance,
// then most recently created first. Two-step like searchCategories/
// searchPlaces: rank ids in SQL, hydrate via Prisma, preserve the ranked
// order on the way out.
export async function searchMealPlanItems(
  searchQuery: string,
  userId: string,
  { excludeTripId, meal, limit = 20 }: SearchMealPlanItemsOptions = {},
) {
  const formattedQuery = toPrefixTsQuery(searchQuery);
  if (!formattedQuery) return [];

  const excludeTripIdParam = excludeTripId ?? null;
  const mealParam = meal ?? null;

  const results = await db.$queryRaw<Array<{ id: string }>>`
SELECT id FROM (
  SELECT DISTINCT ON ("MealPlanItem".name)
    "MealPlanItem".id,
    "MealPlanItem".meal,
    "MealPlanItem".data_fts,
    "MealPlanItem"."createdAt"
    FROM "MealPlanItem"
    JOIN "MealPlanDay" ON "MealPlanDay".id = "MealPlanItem"."mealPlanDayId"
    JOIN "Trip" ON "Trip".id = "MealPlanDay"."tripId"
    WHERE "MealPlanItem".data_fts @@ to_tsquery('english', ${formattedQuery})
      AND "Trip"."userId" = ${userId}
      AND (${excludeTripIdParam}::text IS NULL OR "Trip".id != ${excludeTripIdParam})
    ORDER BY "MealPlanItem".name, "MealPlanItem"."createdAt" DESC
) AS deduped
  ORDER BY (meal = ${mealParam}::"MealName") DESC,
           ts_rank(data_fts, to_tsquery('english', ${formattedQuery})) DESC,
           "createdAt" DESC
  LIMIT ${limit};
`;

  const rankedIds = results.map((result) => result.id);
  const items = await db.mealPlanItem.findMany({
    where: { id: { in: rankedIds } },
  });
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return rankedIds
    .map((id) => itemsById.get(id))
    .filter((item) => item !== undefined);
}

export async function searchCategories(
  searchQuery: string,
  forUserId: string | null = null,
) {
  const formattedQuery = toPrefixTsQuery(searchQuery);
  if (!formattedQuery) return [];

  const results = await db.$queryRaw<Array<{ id: string }>>`
SELECT "GearCategory".id
  FROM "GearCategory"
  WHERE "GearCategory".data_fts @@ to_tsquery('english', ${formattedQuery})
    AND (public=TRUE OR "userId"=${forUserId});
`;

  return db.gearCategory.findMany({
    where: {
      id: {
        in: results.map((result) => result.id),
      },
    },
  });
}
