-- CreateEnum
CREATE TYPE "SourceIdType" AS ENUM ('WDPA_Cd', 'PADUS_OBJECTID', 'NPS_parkCode', 'RIDB_FacilityID');

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT,
    "publicAccess" TEXT,
    "backpackingTier" INTEGER NOT NULL DEFAULT 0,
    "acres" DOUBLE PRECISION,
    "data_fts" tsvector,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceSourceId" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "idType" "SourceIdType" NOT NULL,
    "idValue" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "protectedAreaId" TEXT,

    CONSTRAINT "PlaceSourceId_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Place_state_idx" ON "Place"("state");

-- CreateIndex
CREATE INDEX "Place_name_idx" ON "Place"("name");

-- CreateIndex
CREATE INDEX "Place_data_fts_idx" ON "Place" USING GIN ("data_fts");

-- CreateIndex
CREATE INDEX "PlaceSourceId_placeId_idx" ON "PlaceSourceId"("placeId");

-- CreateIndex
CREATE INDEX "PlaceSourceId_protectedAreaId_idx" ON "PlaceSourceId"("protectedAreaId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceSourceId_idType_idValue_key" ON "PlaceSourceId"("idType", "idValue");

-- AddForeignKey
ALTER TABLE "PlaceSourceId" ADD CONSTRAINT "PlaceSourceId_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceSourceId" ADD CONSTRAINT "PlaceSourceId_protectedAreaId_fkey" FOREIGN KEY ("protectedAreaId") REFERENCES "ProtectedArea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Deterministic name normalization used to group duplicate source rows into a
-- single canonical Place (lowercase, trimmed, whitespace collapsed). IMMUTABLE
-- so it can be used in indexes/joins.
CREATE OR REPLACE FUNCTION place_norm_name(value text) RETURNS text AS $$
    SELECT lower(regexp_replace(btrim(value), '\s+', ' ', 'g'));
$$ LANGUAGE sql IMMUTABLE;

-- Backpacking relevance tier for a single PAD-US source row. The derivation
-- job takes MAX() of this across a name+state group so a Place inherits its
-- best feature class. Higher is more relevant to backpacking:
--   3  federal/state public land (national/state forests, parks, wilderness...)
--   2  local/district land (city & county parks)
--   1  other open land
--   0  demoted: closed access, private parks (PPRK: golf/fairgrounds/clubs),
--      or private/NGO conservation & agricultural easements
-- Access codes: XA=closed (demoted); RA=restricted is NOT demoted -- it usually
-- means "permit required", which is normal for prime backpacking.
CREATE OR REPLACE FUNCTION place_backpacking_tier(
    public_access text,
    designation_type text,
    manager_type text,
    category text
) RETURNS integer AS $$
    SELECT CASE
        WHEN public_access = 'XA' THEN 0
        WHEN designation_type = 'PPRK' THEN 0
        WHEN category = 'easement' AND manager_type IN ('PVT', 'NGO') THEN 0
        WHEN manager_type IN ('FED', 'STAT') THEN 3
        WHEN manager_type IN ('LOC', 'DIST') THEN 2
        ELSE 1
    END;
$$ LANGUAGE sql IMMUTABLE;

-- Full-text search trigger over the canonical name (mirrors GearCategory).
CREATE OR REPLACE FUNCTION place_fts_trigger() RETURNS trigger AS $$
BEGIN
    NEW.data_fts := to_tsvector('english', COALESCE(NEW.name, ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER place_data_fts_update
BEFORE INSERT OR UPDATE ON "Place"
FOR EACH ROW
EXECUTE FUNCTION place_fts_trigger();
