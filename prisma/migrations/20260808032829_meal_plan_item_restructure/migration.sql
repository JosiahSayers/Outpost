-- BTP-104: MealPlanItem becomes a reusable, per-user canonical entity.
-- Single migration (expand -> merge -> contract) so the whole restructure
-- ships in one deploy -- there's no window to run a manual script between
-- two separate migrations, since the app applies all pending migrations
-- automatically on boot.

-- ============================================================
-- 1. Expand: add new columns, backfill userId from the existing
--    MealPlanItem -> MealPlanDay -> Trip chain.
-- ============================================================
ALTER TABLE "MealPlanItem" ADD COLUMN "brand" TEXT;
ALTER TABLE "MealPlanItem" ADD COLUMN "userId" TEXT;

UPDATE "MealPlanItem" mi
SET "userId" = t."userId"
FROM "MealPlanDay" md
JOIN "Trip" t ON t.id = md."tripId"
WHERE md.id = mi."mealPlanDayId";

-- ============================================================
-- 2. Create the new join table (placements of a MealPlanItem on a
--    MealPlanDay/meal slot).
-- ============================================================
CREATE TABLE "MealPlanDayItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "meal" "MealName" NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "purchased" BOOLEAN NOT NULL DEFAULT false,
    "packed" BOOLEAN NOT NULL DEFAULT false,
    "mealPlanDayId" TEXT NOT NULL,
    "mealPlanItemId" TEXT NOT NULL,

    CONSTRAINT "MealPlanDayItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MealPlanDayItem_mealPlanDayId_idx" ON "MealPlanDayItem"("mealPlanDayId");
CREATE INDEX "MealPlanDayItem_mealPlanItemId_idx" ON "MealPlanDayItem"("mealPlanItemId");
CREATE UNIQUE INDEX "MealPlanDayItem_mealPlanDayId_mealPlanItemId_meal_key" ON "MealPlanDayItem"("mealPlanDayId", "mealPlanItemId", "meal");

ALTER TABLE "MealPlanDayItem" ADD CONSTRAINT "MealPlanDayItem_mealPlanDayId_fkey" FOREIGN KEY ("mealPlanDayId") REFERENCES "MealPlanDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealPlanDayItem" ADD CONSTRAINT "MealPlanDayItem_mealPlanItemId_fkey" FOREIGN KEY ("mealPlanItemId") REFERENCES "MealPlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 3. Merge exact-duplicate MealPlanItem rows (same userId, name,
--    calories, waterMl, dryWeightGrams, brand -- brand is null for
--    every pre-migration row) into one canonical item per group,
--    creating a MealPlanDayItem placement for every original
--    (day, meal) the group appeared on. Placements that land on the
--    same (canonical item, day, meal) -- because two duplicate rows
--    happened to already be on the same day+meal -- are aggregated
--    into a single row (summed quantity, OR'd status) rather than
--    violating the new unique constraint.
--
-- No production data exists yet (staging only, single user), so
-- approximate correctness here is acceptable; any leftover
-- near-duplicates can be cleaned up manually.
-- ============================================================
WITH canon AS (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY "userId", name, calories, "waterMl", "dryWeightGrams", brand
           ORDER BY "createdAt" DESC, id DESC
         ) AS canonical_id
  FROM "MealPlanItem"
),
placements AS (
  SELECT c.canonical_id AS "mealPlanItemId",
         mi."mealPlanDayId",
         mi.meal,
         SUM(mi.quantity) AS quantity,
         BOOL_OR(COALESCE(s.purchased, false)) AS purchased,
         BOOL_OR(COALESCE(s.packed, false)) AS packed
  FROM "MealPlanItem" mi
  JOIN canon c ON c.id = mi.id
  LEFT JOIN "MealPlanItemPackingStatus" s ON s."mealPlanItemId" = mi.id
  GROUP BY c.canonical_id, mi."mealPlanDayId", mi.meal
)
INSERT INTO "MealPlanDayItem" (id, "createdAt", "updatedAt", meal, quantity, purchased, packed, "mealPlanDayId", "mealPlanItemId")
SELECT gen_random_uuid()::text, now(), now(), meal, quantity, purchased, packed, "mealPlanDayId", "mealPlanItemId"
FROM placements;

-- Delete non-canonical items (cascades their MealPlanItemPackingStatus rows
-- via the still-present FK, since MealPlanItemPackingStatus is dropped
-- after this step).
WITH canon AS (
  SELECT id,
         FIRST_VALUE(id) OVER (
           PARTITION BY "userId", name, calories, "waterMl", "dryWeightGrams", brand
           ORDER BY "createdAt" DESC, id DESC
         ) AS canonical_id
  FROM "MealPlanItem"
)
DELETE FROM "MealPlanItem" WHERE id IN (SELECT id FROM canon WHERE id != canonical_id);

-- ============================================================
-- 4. Contract: drop the old direct-day relationship and the old
--    packing-status table now that every row's data has been carried
--    forward into MealPlanDayItem.
-- ============================================================
ALTER TABLE "MealPlanItem" DROP CONSTRAINT "MealPlanItem_mealPlanDayId_fkey";
DROP INDEX "MealPlanItem_mealPlanDayId_idx";
ALTER TABLE "MealPlanItemPackingStatus" DROP CONSTRAINT "MealPlanItemPackingStatus_mealPlanItemId_fkey";
DROP TABLE "MealPlanItemPackingStatus";

ALTER TABLE "MealPlanItem"
  DROP COLUMN "meal",
  DROP COLUMN "mealPlanDayId",
  DROP COLUMN "quantity",
  ALTER COLUMN "userId" SET NOT NULL;

CREATE INDEX "MealPlanItem_userId_idx" ON "MealPlanItem"("userId");
ALTER TABLE "MealPlanItem" ADD CONSTRAINT "MealPlanItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================
-- 5. Update the full-text search trigger to also index brand. No
--    backfill needed -- brand is null for every existing row at this
--    point, so coalesce(brand,'') is a no-op and existing data_fts
--    values stay correct.
-- ============================================================
CREATE OR REPLACE FUNCTION meal_plan_item_fts_trigger() RETURNS trigger AS $$
BEGIN
    NEW.data_fts := to_tsvector('english', coalesce(NEW.name, '') || ' ' || coalesce(NEW.brand, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
