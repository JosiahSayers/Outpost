import type { MealPlanItemSearchResult } from "$/transformers/meal-plan/item-search-result";
import { db } from "$/utils/db";
import type { Image, PublicMealItem } from "../../generated/prisma/client";
import type { MealName } from "../../generated/prisma/enums";

type PublicMealItemWithImage = PublicMealItem & { image: Image | null };

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
  { state, limit = 6, includeLowValue = false }: SearchPlacesOptions = {},
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
// so fork-on-add never has to cope with a gap -- see BTP-111. An admin can
// bypass this via readyOverride when a vendor genuinely never publishes one
// of the fields -- see the PublicMealItem model and mergePublicMealItem.
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
  { excludeTripId, meal, limit = 6 }: SearchMealPlanItemsOptions = {},
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
      AND (
        "PublicMealItem"."readyOverride"
        OR (
          "PublicMealItem".brand IS NOT NULL
          AND "PublicMealItem".calories IS NOT NULL
          AND "PublicMealItem"."waterMl" IS NOT NULL
          AND "PublicMealItem"."dryWeightGrams" IS NOT NULL
        )
      )
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

export interface SearchPublicMealItemsOptions {
  vendor?: string[];
  brand?: string[];
  take?: number;
  skip?: number;
}

// Powers the admin meal catalog search/browse. searchQuery is optional --
// with none, this is just a filtered, paginated listing of PublicMealItem
// ordered by name. With one, it's the same rank-ids-then-hydrate FTS pattern
// as searchPlaces/searchCategories, with the vendor/brand filters and
// pagination applied inside the ranking query so LIMIT/OFFSET land on the
// post-filter result set rather than truncating before filtering.
// Pages by take+1: fetching one extra row (dropped before hydration) tells
// the caller whether a next page exists without a second COUNT(*) query --
// admin browsing just needs next/prev, not an exact total.
export async function searchPublicMealItems(
  searchQuery: string | undefined,
  {
    vendor = [],
    brand = [],
    take = 15,
    skip = 0,
  }: SearchPublicMealItemsOptions = {},
): Promise<{ items: PublicMealItemWithImage[]; hasMore: boolean }> {
  const vendorFilter = vendor.length ? vendor : null;
  const brandFilter = brand.length ? brand : null;

  const formattedQuery = searchQuery ? toPrefixTsQuery(searchQuery) : "";
  if (searchQuery && !formattedQuery) return { items: [], hasMore: false };

  let rankedIds: string[];

  if (formattedQuery) {
    const results = await db.$queryRaw<Array<{ id: string }>>`
SELECT "PublicMealItem".id
  FROM "PublicMealItem"
  WHERE "PublicMealItem".data_fts @@ to_tsquery('english', ${formattedQuery})
    AND (${vendorFilter}::text[] IS NULL OR "PublicMealItem"."sourceVendor" = ANY(${vendorFilter}))
    AND (${brandFilter}::text[] IS NULL OR "PublicMealItem".brand = ANY(${brandFilter}))
  ORDER BY ts_rank("PublicMealItem".data_fts, to_tsquery('english', ${formattedQuery})) DESC,
           "PublicMealItem".name ASC
  LIMIT ${take + 1} OFFSET ${skip};
`;
    rankedIds = results.map((result) => result.id);
  } else {
    const rows = await db.publicMealItem.findMany({
      where: {
        sourceVendor: vendorFilter ? { in: vendorFilter } : undefined,
        brand: brandFilter ? { in: brandFilter } : undefined,
      },
      select: { id: true },
      orderBy: { name: "asc" },
      take: take + 1,
      skip,
    });
    rankedIds = rows.map((row) => row.id);
  }

  const hasMore = rankedIds.length > take;
  rankedIds = rankedIds.slice(0, take);

  const items = await db.publicMealItem.findMany({
    where: { id: { in: rankedIds } },
    include: { image: true },
  });
  const itemsById = new Map(items.map((item) => [item.id, item]));

  return {
    items: rankedIds
      .map((id) => itemsById.get(id))
      .filter((item) => item !== undefined),
    hasMore,
  };
}

// Shared by searchCategories/suggestCategories: runs an already-built
// tsquery against data_fts, ranks, then hydrates while preserving rank
// order (same "rank ids in SQL, then hydrate" idiom as searchPlaces/
// searchMealPlanItems). What differs between the two callers is only how
// the tsquery gets built -- see toPrefixTsQuery vs toPrefixOrTsQuery below.
async function queryCategoriesByTsQuery(
  formattedQuery: string,
  forUserId: string | null,
  limit: number,
) {
  if (!formattedQuery) return [];

  const results = await db.$queryRaw<Array<{ id: string }>>`
SELECT "GearCategory".id
  FROM "GearCategory"
  WHERE "GearCategory".data_fts @@ to_tsquery('english', ${formattedQuery})
    AND (public=TRUE OR "userId"=${forUserId})
  ORDER BY ts_rank("GearCategory".data_fts, to_tsquery('english', ${formattedQuery})) DESC
  LIMIT ${limit};
`;

  const rankedIds = results.map((result) => result.id);
  const categories = await db.gearCategory.findMany({
    where: { id: { in: rankedIds } },
  });
  const categoriesById = new Map(
    categories.map((category) => [category.id, category]),
  );
  return rankedIds
    .map((id) => categoriesById.get(id))
    .filter((category) => category !== undefined);
}

export async function searchCategories(
  searchQuery: string,
  forUserId: string | null = null,
  limit = 6,
) {
  return queryCategoriesByTsQuery(
    toPrefixTsQuery(searchQuery),
    forUserId,
    limit,
  );
}

// Same tokenization as toPrefixTsQuery, but OR's terms instead of AND'ing
// them: item names are full product names with lots of irrelevant
// brand/model words, so requiring every token to match (like search-as-you-
// type does) would almost never hit. ts_rank still scores more/better
// matches higher, so results stay ranked best-first.
//
// This can't just be toPrefixTsQuery with a different join operator shared
// by both callers: AND vs OR is a real behavioral difference, not a style
// choice. searchCategories backs the category text box, where a person is
// typing to narrow down to one category -- AND means each extra word
// narrows the result set, the expected "type to narrow" behavior of a
// search box. suggestCategories matches against a whole product name, which
// is mostly brand/model noise -- AND-ing that would almost never match
// anything real, so it needs "any relevant word counts" instead.
function toPrefixOrTsQuery(searchQuery: string): string {
  return searchQuery
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean)
    .map((word) => `${word}:*`)
    .join(" | ");
}

// Suggests categories for a gear item name by matching it against category
// name + keywords (see the `keywords` column on GearCategory, folded into
// data_fts by the gear_category_fts_trigger). Keeping match data on the
// category row -- rather than a hardcoded keyword table in code -- means a
// private category is picked up for free via its own name (e.g. a user's
// "1P Tent" already matches "tent" with no keyword data needed at all);
// keywords only need seeding on public categories to add synonyms/brand
// terms not literally in their name.
export async function suggestCategories(
  itemName: string,
  forUserId: string | null = null,
  limit = 3,
) {
  return queryCategoriesByTsQuery(
    toPrefixOrTsQuery(itemName),
    forUserId,
    limit,
  );
}
