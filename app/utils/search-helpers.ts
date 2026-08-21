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

// Shared by searchCategories/suggestCategories: given ids already ranked by
// a SQL query, hydrates them via Prisma and reorders the result to match --
// findMany doesn't preserve `id: { in: [...] }` order on its own (same
// "rank ids in SQL, then hydrate" idiom as searchPlaces/searchMealPlanItems).
async function hydrateCategoriesInOrder(rankedIds: string[]) {
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
  const formattedQuery = toPrefixTsQuery(searchQuery);
  if (!formattedQuery) return [];

  const results = await db.$queryRaw<Array<{ id: string }>>`
SELECT "GearCategory".id
  FROM "GearCategory"
  WHERE "GearCategory".data_fts @@ to_tsquery('english', ${formattedQuery})
    AND (public=TRUE OR "userId"=${forUserId})
  ORDER BY ts_rank("GearCategory".data_fts, to_tsquery('english', ${formattedQuery})) DESC
  LIMIT ${limit};
`;

  return hydrateCategoriesInOrder(results.map((result) => result.id));
}

// Words that legitimately describe multiple, unrelated categories in this
// catalog purely because they're used as an organizational suffix rather
// than a description of the item itself -- "gear" shows up in "Dog Gear",
// "Gear Lofts", and "Gear Maintenance & Repair", none of which have
// anything to do with each other, or with whatever item name happens to
// contain the word. It's also an extremely common cottage-brand suffix in
// this exact industry (Gossamer Gear, Granite Gear, ULA Gear), so without
// this it reliably collides: "Granite Gear Crown2" would loosely match
// those three unrelated categories purely via the brand name. Filtering it
// out of the item-name side costs nothing -- no curated keyword relies on
// bare "gear" either.
//
// "pack"/"packs" is the same pattern: shared by "Fanny Packs", "Pack
// Covers", "Pack Liners", and "Pack Organization" -- none related to each
// other -- and "pack" is both a common informal synonym for "backpack" and
// a common cottage-brand word (Atom Packs, Pa'lante Packs). Confirmed by a
// real regression: "Atom Packs Prospector" correctly matched the "atom
// packs" keyword for Backpacks (match_count 1), but tied with those four
// other categories at match_count 1 too and lost the tiebreak, so
// Backpacks never made the top-3. Each of those four categories has its
// own other distinguishing word (Fanny, Covers, Liners, Organization) that
// still carries the real signal once "pack" is filtered out.
const NAME_MATCH_STOPWORDS = new Set(["gear", "gears", "pack", "packs"]);

// Tokenizes an item name into exact (non-prefix), OR'd terms -- used only to
// test against a category's bare `name`, not its keywords (see
// suggestCategories). No `:*` prefix: suggestions are only ever shown once
// the user has moved on from the item-name field, so there's no in-progress
// partial word to match -- and skipping prefix matching avoids spurious
// hits like a bare "1" in an item name prefix-matching a private category
// literally named "1P Tent" (its stored lexeme is "1p", which "1:*" would
// wrongly prefix-match but plain "1" does not).
function toExactOrTsQuery(itemName: string): string {
  return itemName
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}-]/gu, "").replace(/^-+|-+$/g, ""))
    .filter(Boolean)
    .filter((word) => !NAME_MATCH_STOPWORDS.has(word.toLowerCase()))
    .join(" | ");
}

// Suggests categories for a gear item name. Two different match rules
// combine here, deliberately:
//
// - A category's own `name` is checked with a loose, word-level OR match
//   (toExactOrTsQuery above) -- any single word shared between the item
//   name and the category name counts. This is what lets a private
//   category be picked up for free via its own name with zero keyword data
//   (e.g. a user's "1P Tent" matches an item name containing "tent").
// - Curated `keywords` are checked with phraseto_tsquery, which requires
//   each keyword's words to appear adjacent, in that order, in the item
//   name -- not just anywhere independently. This is required precision,
//   not a style choice: a keyword built from a generic word + a distinctive
//   one (REI's "Half Dome", MSR's "Wind Pro") would leak the generic half
//   ("half", "wind") as its own standalone trigger under a loose match and
//   cause false-positive suggestions on unrelated items (a "Half Zip
//   Fleece" wrongly suggesting Tents). Phrase-adjacency fixes that: "Half
//   Dome" only matches an item name that actually contains "half"
//   immediately followed by "dome".
//
// This doesn't use data_fts/its GIN index for either check -- data_fts
// still exists for searchCategories, but folding keywords into it isn't
// useful here since a bag-of-words match on data_fts can't express the
// phrase-adjacency requirement keywords need. GearCategory is small enough
// (under a couple hundred rows) that a sequential scan checking each row is
// cheap, and a per-row dynamic phraseto_tsquery couldn't use a static index
// anyway.
export async function suggestCategories(
  itemName: string,
  forUserId: string | null = null,
  limit = 3,
) {
  const nameQuery = toExactOrTsQuery(itemName);
  if (!nameQuery) return [];

  const results = await db.$queryRaw<
    Array<{ id: string; match_count: number }>
  >`
SELECT "GearCategory".id,
  (
    (CASE WHEN to_tsvector('english', "GearCategory".name) @@ to_tsquery('english', ${nameQuery}) THEN 1 ELSE 0 END)
    + (
      SELECT count(*)::int FROM unnest("GearCategory".keywords) AS keyword
      WHERE to_tsvector('english', ${itemName}) @@ phraseto_tsquery('english', keyword)
    )
  ) AS match_count
FROM "GearCategory"
WHERE (public=TRUE OR "userId"=${forUserId})
  AND (
    to_tsvector('english', "GearCategory".name) @@ to_tsquery('english', ${nameQuery})
    OR EXISTS (
      SELECT 1 FROM unnest("GearCategory".keywords) AS keyword
      WHERE to_tsvector('english', ${itemName}) @@ phraseto_tsquery('english', keyword)
    )
  )
ORDER BY match_count DESC
LIMIT ${limit};
`;

  return hydrateCategoriesInOrder(results.map((result) => result.id));
}
