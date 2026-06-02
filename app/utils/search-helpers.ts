import { db } from "$/utils/db";

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
