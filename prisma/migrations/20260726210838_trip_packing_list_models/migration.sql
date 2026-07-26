-- CreateTable
CREATE TABLE "TripPackingList" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tripId" TEXT NOT NULL,
    "packingListId" INTEGER NOT NULL,

    CONSTRAINT "TripPackingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPackingListItemStatus" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "packed" BOOLEAN NOT NULL DEFAULT false,
    "notNeeded" BOOLEAN NOT NULL DEFAULT false,
    "tripPackingListId" TEXT NOT NULL,
    "packingListItemId" INTEGER NOT NULL,

    CONSTRAINT "TripPackingListItemStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripPackingList_packingListId_idx" ON "TripPackingList"("packingListId");

-- CreateIndex
CREATE UNIQUE INDEX "TripPackingList_tripId_key" ON "TripPackingList"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripPackingListItemStatus_tripPackingListId_packingListItem_key" ON "TripPackingListItemStatus"("tripPackingListId", "packingListItemId");

-- AddForeignKey
ALTER TABLE "TripPackingList" ADD CONSTRAINT "TripPackingList_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPackingList" ADD CONSTRAINT "TripPackingList_packingListId_fkey" FOREIGN KEY ("packingListId") REFERENCES "PackingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPackingListItemStatus" ADD CONSTRAINT "TripPackingListItemStatus_tripPackingListId_fkey" FOREIGN KEY ("tripPackingListId") REFERENCES "TripPackingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPackingListItemStatus" ADD CONSTRAINT "TripPackingListItemStatus_packingListItemId_fkey" FOREIGN KEY ("packingListItemId") REFERENCES "PackingListItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
