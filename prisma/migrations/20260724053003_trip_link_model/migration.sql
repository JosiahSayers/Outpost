-- CreateTable
CREATE TABLE "TripLink" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "url" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "type" TEXT,
    "siteName" TEXT,
    "audioUrl" TEXT,
    "videoUrl" TEXT,
    "tripId" TEXT NOT NULL,

    CONSTRAINT "TripLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TripLink_url_tripId_key" ON "TripLink"("url", "tripId");

-- AddForeignKey
ALTER TABLE "TripLink" ADD CONSTRAINT "TripLink_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
