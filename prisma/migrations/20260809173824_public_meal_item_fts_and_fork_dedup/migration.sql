-- BTP-111: fork-on-add reuses an existing fork of the same public item
-- rather than duplicating it. NULLs are distinct under a Postgres unique
-- index, so ordinary (non-forked) MealPlanItem rows -- publicMealSourceId
-- IS NULL -- never collide with each other under this constraint; only two
-- forks of the same PublicMealItem by the same user would.
CREATE UNIQUE INDEX "MealPlanItem_userId_publicMealSourceId_key" ON "MealPlanItem"("userId", "publicMealSourceId");

-- BTP-111: make PublicMealItem searchable the same way MealPlanItem is.
ALTER TABLE "PublicMealItem" ADD COLUMN     "data_fts" tsvector;

-- CreateIndex
CREATE INDEX "PublicMealItem_data_fts_idx" ON "PublicMealItem" USING GIN ("data_fts");

-- Backfill existing rows
UPDATE "PublicMealItem" SET "data_fts" = to_tsvector('english', coalesce(name, '') || ' ' || coalesce(brand, ''));

-- Full-text search trigger over name + brand (mirrors MealPlanItem).
CREATE OR REPLACE FUNCTION public_meal_item_fts_trigger() RETURNS trigger AS $$
BEGIN
    NEW.data_fts := to_tsvector('english', coalesce(NEW.name, '') || ' ' || coalesce(NEW.brand, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER public_meal_item_data_fts_update
BEFORE INSERT OR UPDATE ON "PublicMealItem"
FOR EACH ROW
EXECUTE FUNCTION public_meal_item_fts_trigger();
