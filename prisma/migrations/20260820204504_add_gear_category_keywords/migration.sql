-- AlterTable
ALTER TABLE "GearCategory" ADD COLUMN "keywords" TEXT[] NOT NULL DEFAULT '{}';

-- Extend the FTS trigger (see 20260531003737_fts_triggers) to also index keywords
CREATE OR REPLACE FUNCTION gear_category_fts_trigger() RETURNS trigger AS $$
BEGIN
    NEW.data_fts := to_tsvector('english',
        COALESCE(NEW.name, '') || ' ' || COALESCE(array_to_string(NEW.keywords, ' '), ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Keyword content itself lives in the gear-category-keywords production
-- seed (single source of truth, see prisma/seeds/production/gear-category-
-- keywords.ts), not here -- that seed runs on both fresh installs and
-- already-migrated environments (tracked via AppliedSeeds, same as any
-- other production seed), so a migration-time data backfill isn't needed.
