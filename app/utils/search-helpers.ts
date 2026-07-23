import { db } from "$/utils/db";

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

export async function searchCategories(
  searchQuery: string,
  forUserId: string | null = null,
) {
  const formattedQuery = searchQuery
    .split(" ")
    .map((word) => `${word}:*`) // Make each word a partial match
    .join(" & "); // Require all words in row

  const results = await db.$queryRaw<Array<{ id: number }>>`
SELECT "GearCategory".id
  FROM "GearCategory"
  WHERE "GearCategory".data_fts @@ to_tsquery('english', ${formattedQuery}) AND (public=TRUE OR "userId"=${forUserId});
`;

  return db.gearCategory.findMany({
    where: {
      id: {
        in: results.map((result) => result.id),
      },
    },
  });
}
