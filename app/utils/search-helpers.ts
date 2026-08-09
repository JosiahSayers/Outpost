import type { MealPlanItemSearchResult } from "$/transformers/meal-plan/item-search-result";
import { db } from "$/utils/db";
import type { MealName } from "../../generated/prisma/enums";

// Turn free-text input into a prefix-match tsquery: each whitespace-delimited
// token becomes a `token:*` prefix term, all required (`&`). Mirrors
// searchCategories. Returns "" for blank input so callers can short-circuit.
//
// Tokens are stripped of everything but letters/digits before being turned
// into terms -- tsquery syntax chars (&, |, !, :, (, )) survive the
// whitespace split (e.g. "Gear & Repair" -> ["Gear", "&", "Repair"]) and a
// bare "&" becomes the invalid term "&:*", so a punctuation-only token must
// be dropped rather than passed through.
function toPrefixTsQuery(searchQuery: string): string {
  return searchQuery
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
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
  // Exclude items already placed anywhere on this trip's current meal plan,
  // so "previous trips" doesn't just echo items already added to this one.
  excludeTripId?: string;
  // Boost items that have ever been placed in this meal slot, so e.g.
  // searching from a breakfast slot surfaces the user's past breakfasts
  // first. Items with no matching placement are still returned, just
  // ranked lower.
  meal?: MealName;
  limit?: number;
}

// Full-text autocomplete over a user's own reusable MealPlanItem rows,
// unioned with the public catalog (BTP-111). Both are ranked together --
// own items by meal placement history then text relevance then recency
// (BTP-77/BTP-104, unchanged); public items have no placement history of
// their own (only their forks get placed) so they rank by text relevance
// then recency alongside everything else. Only "complete" public items
// (every nullable field but the image is filled in) are searchable at all,
// so fork-on-add never has to cope with a gap -- see BTP-111.
// An own item that's itself a fork (publicMealSourceId set) is excluded
// from the "own" branch -- otherwise adding a public item once would make
// it show up twice (as itself and as the fork) on every later search.
// Re-selecting the public entry still reuses that same fork via the
// userId+publicMealSourceId upsert in the create route, so nothing is lost
// by hiding the fork from search.
// Two-step like searchCategories/searchPlaces: rank (source, id) pairs in
// SQL via UNION ALL, hydrate each table via Prisma, preserve the ranked
// order on the way out.
export async function searchMealPlanItems(
  searchQuery: string,
  userId: string,
  { excludeTripId, meal, limit = 20 }: SearchMealPlanItemsOptions = {},
): Promise<MealPlanItemSearchResult[]> {
  const formattedQuery = toPrefixTsQuery(searchQuery);
  if (!formattedQuery) return [];

  const excludeTripIdParam = excludeTripId ?? null;
  const mealParam = meal ?? null;

  const results = await db.$queryRaw<
    Array<{ id: string; source: "own" | "public" }>
  >`
SELECT id, source FROM (
  SELECT "MealPlanItem".id AS id,
         'own' AS source,
         (${mealParam}::"MealName" IS NOT NULL AND EXISTS (
              SELECT 1 FROM "MealPlanDayItem" mpdi
              WHERE mpdi."mealPlanItemId" = "MealPlanItem".id
                AND mpdi.meal = ${mealParam}::"MealName"
            )) AS meal_boost,
         ts_rank("MealPlanItem".data_fts, to_tsquery('english', ${formattedQuery})) AS rank,
         "MealPlanItem"."createdAt" AS created_at
    FROM "MealPlanItem"
    WHERE "MealPlanItem".data_fts @@ to_tsquery('english', ${formattedQuery})
      AND "MealPlanItem"."userId" = ${userId}
      AND "MealPlanItem"."publicMealSourceId" IS NULL
      AND (${excludeTripIdParam}::text IS NULL OR NOT EXISTS (
        SELECT 1 FROM "MealPlanDayItem" mpdi
        JOIN "MealPlanDay" md ON md.id = mpdi."mealPlanDayId"
        WHERE mpdi."mealPlanItemId" = "MealPlanItem".id
          AND md."tripId" = ${excludeTripIdParam}
      ))

  UNION ALL

  SELECT "PublicMealItem".id AS id,
         'public' AS source,
         FALSE AS meal_boost,
         ts_rank("PublicMealItem".data_fts, to_tsquery('english', ${formattedQuery})) AS rank,
         "PublicMealItem"."createdAt" AS created_at
    FROM "PublicMealItem"
    WHERE "PublicMealItem".data_fts @@ to_tsquery('english', ${formattedQuery})
      AND "PublicMealItem".brand IS NOT NULL
      AND "PublicMealItem".calories IS NOT NULL
      AND "PublicMealItem"."waterMl" IS NOT NULL
      AND "PublicMealItem"."dryWeightGrams" IS NOT NULL
) combined
ORDER BY meal_boost DESC, rank DESC, created_at DESC
LIMIT ${limit};
`;

  const ownIds = results.filter((r) => r.source === "own").map((r) => r.id);
  const publicIds = results
    .filter((r) => r.source === "public")
    .map((r) => r.id);

  const [ownItems, publicItems] = await Promise.all([
    db.mealPlanItem.findMany({ where: { id: { in: ownIds } } }),
    db.publicMealItem.findMany({
      where: { id: { in: publicIds } },
      include: { image: true },
    }),
  ]);
  const ownById = new Map(ownItems.map((item) => [item.id, item]));
  const publicById = new Map(publicItems.map((item) => [item.id, item]));

  return results
    .map((result): MealPlanItemSearchResult | undefined => {
      if (result.source === "own") {
        const item = ownById.get(result.id);
        return item ? { source: "own", item } : undefined;
      }
      const item = publicById.get(result.id);
      return item ? { source: "public", item } : undefined;
    })
    .filter((result) => result !== undefined);
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
