-- Convert integer-based primary keys (and their foreign keys) to UUIDs for
-- AppliedSeeds, GearCategory, GearInventoryItem, PackingList,
-- PackingListSection, and PackingListItem. Better Auth models (User, Session,
-- Account, Verification) are untouched.
--
-- Strategy per table: add a new TEXT column populated with a fresh
-- gen_random_uuid() per row, propagate that new id to every column that
-- references the old integer id (via a join back to the old id), then drop
-- the old int column/constraints and rename the new column into place.
-- Composite unique indexes that include a swapped column are dropped
-- implicitly when that column is dropped, so they're recreated at the end.

--
-- AppliedSeeds (no incoming foreign keys)
--
ALTER TABLE "AppliedSeeds" ADD COLUMN "id_new" TEXT;
UPDATE "AppliedSeeds" SET "id_new" = gen_random_uuid()::text;
ALTER TABLE "AppliedSeeds" DROP CONSTRAINT "AppliedSeeds_pkey";
ALTER TABLE "AppliedSeeds" DROP COLUMN "id";
ALTER TABLE "AppliedSeeds" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "AppliedSeeds" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "AppliedSeeds" ADD CONSTRAINT "AppliedSeeds_pkey" PRIMARY KEY ("id");

--
-- GearCategory (referenced by GearInventoryItem.gearCategoryId and
-- PackingListItem.gearCategoryId)
--
ALTER TABLE "GearCategory" ADD COLUMN "id_new" TEXT;
UPDATE "GearCategory" SET "id_new" = gen_random_uuid()::text;

ALTER TABLE "GearInventoryItem" ADD COLUMN "gearCategoryId_new" TEXT;
UPDATE "GearInventoryItem" gi
  SET "gearCategoryId_new" = gc."id_new"
  FROM "GearCategory" gc
  WHERE gi."gearCategoryId" = gc."id";

ALTER TABLE "PackingListItem" ADD COLUMN "gearCategoryId_new" TEXT;
UPDATE "PackingListItem" pli
  SET "gearCategoryId_new" = gc."id_new"
  FROM "GearCategory" gc
  WHERE pli."gearCategoryId" = gc."id";

ALTER TABLE "GearInventoryItem" DROP CONSTRAINT "GearInventoryItem_gearCategoryId_fkey";
ALTER TABLE "PackingListItem" DROP CONSTRAINT "PackingListItem_gearCategoryId_fkey";

ALTER TABLE "GearCategory" DROP CONSTRAINT "GearCategory_pkey";
ALTER TABLE "GearCategory" DROP COLUMN "id";
ALTER TABLE "GearCategory" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "GearCategory" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "GearCategory" ADD CONSTRAINT "GearCategory_pkey" PRIMARY KEY ("id");

ALTER TABLE "GearInventoryItem" DROP COLUMN "gearCategoryId";
ALTER TABLE "GearInventoryItem" RENAME COLUMN "gearCategoryId_new" TO "gearCategoryId";
ALTER TABLE "GearInventoryItem" ALTER COLUMN "gearCategoryId" SET NOT NULL;
ALTER TABLE "GearInventoryItem" ADD CONSTRAINT "GearInventoryItem_gearCategoryId_fkey" FOREIGN KEY ("gearCategoryId") REFERENCES "GearCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PackingListItem" DROP COLUMN "gearCategoryId";
ALTER TABLE "PackingListItem" RENAME COLUMN "gearCategoryId_new" TO "gearCategoryId";
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_gearCategoryId_fkey" FOREIGN KEY ("gearCategoryId") REFERENCES "GearCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

--
-- GearInventoryItem (referenced by PackingListItem.gearInventoryItemId)
--
ALTER TABLE "GearInventoryItem" ADD COLUMN "id_new" TEXT;
UPDATE "GearInventoryItem" SET "id_new" = gen_random_uuid()::text;

ALTER TABLE "PackingListItem" ADD COLUMN "gearInventoryItemId_new" TEXT;
UPDATE "PackingListItem" pli
  SET "gearInventoryItemId_new" = gi."id_new"
  FROM "GearInventoryItem" gi
  WHERE pli."gearInventoryItemId" = gi."id";

ALTER TABLE "PackingListItem" DROP CONSTRAINT "PackingListItem_gearInventoryItemId_fkey";

ALTER TABLE "GearInventoryItem" DROP CONSTRAINT "GearInventoryItem_pkey";
ALTER TABLE "GearInventoryItem" DROP COLUMN "id";
ALTER TABLE "GearInventoryItem" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "GearInventoryItem" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "GearInventoryItem" ADD CONSTRAINT "GearInventoryItem_pkey" PRIMARY KEY ("id");

ALTER TABLE "PackingListItem" DROP COLUMN "gearInventoryItemId";
ALTER TABLE "PackingListItem" RENAME COLUMN "gearInventoryItemId_new" TO "gearInventoryItemId";
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_gearInventoryItemId_fkey" FOREIGN KEY ("gearInventoryItemId") REFERENCES "GearInventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

--
-- PackingList (referenced by PackingListSection.packingListId,
-- TripPackingList.packingListId, and its own self-referential
-- copiedFromPackingListId)
--
ALTER TABLE "PackingList" ADD COLUMN "id_new" TEXT;
UPDATE "PackingList" SET "id_new" = gen_random_uuid()::text;

ALTER TABLE "PackingList" ADD COLUMN "copiedFromPackingListId_new" TEXT;
UPDATE "PackingList" p
  SET "copiedFromPackingListId_new" = orig."id_new"
  FROM "PackingList" orig
  WHERE p."copiedFromPackingListId" = orig."id";

ALTER TABLE "PackingListSection" ADD COLUMN "packingListId_new" TEXT;
UPDATE "PackingListSection" s
  SET "packingListId_new" = pl."id_new"
  FROM "PackingList" pl
  WHERE s."packingListId" = pl."id";

ALTER TABLE "TripPackingList" ADD COLUMN "packingListId_new" TEXT;
UPDATE "TripPackingList" t
  SET "packingListId_new" = pl."id_new"
  FROM "PackingList" pl
  WHERE t."packingListId" = pl."id";

ALTER TABLE "PackingListSection" DROP CONSTRAINT "PackingListSection_packingListId_fkey";
ALTER TABLE "TripPackingList" DROP CONSTRAINT "TripPackingList_packingListId_fkey";

ALTER TABLE "PackingList" DROP CONSTRAINT "PackingList_pkey";
ALTER TABLE "PackingList" DROP COLUMN "id";
ALTER TABLE "PackingList" DROP COLUMN "copiedFromPackingListId";
ALTER TABLE "PackingList" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "PackingList" RENAME COLUMN "copiedFromPackingListId_new" TO "copiedFromPackingListId";
ALTER TABLE "PackingList" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "PackingList" ADD CONSTRAINT "PackingList_pkey" PRIMARY KEY ("id");

ALTER TABLE "PackingListSection" DROP COLUMN "packingListId";
ALTER TABLE "PackingListSection" RENAME COLUMN "packingListId_new" TO "packingListId";
ALTER TABLE "PackingListSection" ALTER COLUMN "packingListId" SET NOT NULL;
ALTER TABLE "PackingListSection" ADD CONSTRAINT "PackingListSection_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripPackingList" DROP COLUMN "packingListId";
ALTER TABLE "TripPackingList" RENAME COLUMN "packingListId_new" TO "packingListId";
ALTER TABLE "TripPackingList" ALTER COLUMN "packingListId" SET NOT NULL;
ALTER TABLE "TripPackingList" ADD CONSTRAINT "TripPackingList_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate the index dropped implicitly with TripPackingList.packingListId
CREATE INDEX "TripPackingList_packingListId_idx" ON "TripPackingList"("packingListId");

--
-- PackingListSection (referenced by PackingListItem.packingListSectionId)
--
ALTER TABLE "PackingListSection" ADD COLUMN "id_new" TEXT;
UPDATE "PackingListSection" SET "id_new" = gen_random_uuid()::text;

ALTER TABLE "PackingListItem" ADD COLUMN "packingListSectionId_new" TEXT;
UPDATE "PackingListItem" pli
  SET "packingListSectionId_new" = s."id_new"
  FROM "PackingListSection" s
  WHERE pli."packingListSectionId" = s."id";

ALTER TABLE "PackingListItem" DROP CONSTRAINT "PackingListItem_packingListSectionId_fkey";

ALTER TABLE "PackingListSection" DROP CONSTRAINT "PackingListSection_pkey";
ALTER TABLE "PackingListSection" DROP COLUMN "id";
ALTER TABLE "PackingListSection" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "PackingListSection" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "PackingListSection" ADD CONSTRAINT "PackingListSection_pkey" PRIMARY KEY ("id");

ALTER TABLE "PackingListItem" DROP COLUMN "packingListSectionId";
ALTER TABLE "PackingListItem" RENAME COLUMN "packingListSectionId_new" TO "packingListSectionId";
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_packingListSectionId_fkey" FOREIGN KEY ("packingListSectionId") REFERENCES "PackingListSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate the unique index dropped implicitly with PackingListSection.packingListId
CREATE UNIQUE INDEX "PackingListSection_name_packingListId_key" ON "PackingListSection"("name", "packingListId");

--
-- PackingListItem (referenced by TripPackingListItemStatus.packingListItemId)
--
ALTER TABLE "PackingListItem" ADD COLUMN "id_new" TEXT;
UPDATE "PackingListItem" SET "id_new" = gen_random_uuid()::text;

ALTER TABLE "TripPackingListItemStatus" ADD COLUMN "packingListItemId_new" TEXT;
UPDATE "TripPackingListItemStatus" t
  SET "packingListItemId_new" = pli."id_new"
  FROM "PackingListItem" pli
  WHERE t."packingListItemId" = pli."id";

ALTER TABLE "TripPackingListItemStatus" DROP CONSTRAINT "TripPackingListItemStatus_packingListItemId_fkey";

ALTER TABLE "PackingListItem" DROP CONSTRAINT "PackingListItem_pkey";
ALTER TABLE "PackingListItem" DROP COLUMN "id";
ALTER TABLE "PackingListItem" RENAME COLUMN "id_new" TO "id";
ALTER TABLE "PackingListItem" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "PackingListItem" ADD CONSTRAINT "PackingListItem_pkey" PRIMARY KEY ("id");

ALTER TABLE "TripPackingListItemStatus" DROP COLUMN "packingListItemId";
ALTER TABLE "TripPackingListItemStatus" RENAME COLUMN "packingListItemId_new" TO "packingListItemId";
ALTER TABLE "TripPackingListItemStatus" ALTER COLUMN "packingListItemId" SET NOT NULL;
ALTER TABLE "TripPackingListItemStatus" ADD CONSTRAINT "TripPackingListItemStatus_packingListItemId_fkey" FOREIGN KEY ("packingListItemId") REFERENCES "PackingListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Recreate the unique index dropped implicitly with PackingListItem.packingListSectionId
-- rename (and now packingListItemId as well)
CREATE UNIQUE INDEX "PackingListItem_name_packingListSectionId_key" ON "PackingListItem"("name", "packingListSectionId");
CREATE UNIQUE INDEX "TripPackingListItemStatus_tripPackingListId_packingListItem_key" ON "TripPackingListItemStatus"("tripPackingListId", "packingListItemId");
