-- AlterTable
ALTER TABLE "GearCategory" ALTER COLUMN "data_fts" DROP EXPRESSION;

CREATE OR REPLACE FUNCTION gear_category_fts_trigger() RETURNS trigger AS $$
BEGIN
    NEW.data_fts := to_tsvector('english', COALESCE(NEW.name, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER gear_category_data_fts_update
BEFORE INSERT OR UPDATE ON "GearCategory"
FOR EACH ROW
EXECUTE FUNCTION gear_category_fts_trigger();
