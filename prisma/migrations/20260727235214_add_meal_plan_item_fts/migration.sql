-- AlterTable
ALTER TABLE "MealPlanItem" ADD COLUMN     "data_fts" tsvector;

-- CreateIndex
CREATE INDEX "MealPlanItem_data_fts_idx" ON "MealPlanItem" USING GIN ("data_fts");

-- Backfill existing rows
UPDATE "MealPlanItem" SET "data_fts" = to_tsvector('english', COALESCE(name, ''));

-- Full-text search trigger over name (mirrors GearCategory/Place).
CREATE OR REPLACE FUNCTION meal_plan_item_fts_trigger() RETURNS trigger AS $$
BEGIN
    NEW.data_fts := to_tsvector('english', COALESCE(NEW.name, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER meal_plan_item_data_fts_update
BEFORE INSERT OR UPDATE ON "MealPlanItem"
FOR EACH ROW
EXECUTE FUNCTION meal_plan_item_fts_trigger();
