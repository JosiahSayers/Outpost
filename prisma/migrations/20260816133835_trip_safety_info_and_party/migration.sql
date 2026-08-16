-- CreateTable
CREATE TABLE "TripPartyMember" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "userId" TEXT,
    "tripId" TEXT NOT NULL,

    CONSTRAINT "TripPartyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripSafetyInfo" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "rangerStationName" TEXT,
    "rangerStationPhone" TEXT,
    "expectedDepartureTime" TEXT,
    "expectedReturnTime" TEXT,
    "vehicleDescription" TEXT,
    "permitOrRouteNumber" TEXT,
    "medicalNotes" TEXT,
    "tripId" TEXT NOT NULL,

    CONSTRAINT "TripSafetyInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripPartyMember_tripId_idx" ON "TripPartyMember"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "TripSafetyInfo_tripId_key" ON "TripSafetyInfo"("tripId");

-- AddForeignKey
ALTER TABLE "TripPartyMember" ADD CONSTRAINT "TripPartyMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPartyMember" ADD CONSTRAINT "TripPartyMember_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripSafetyInfo" ADD CONSTRAINT "TripSafetyInfo_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripPartyMember" ADD CONSTRAINT "name_or_user_required" CHECK ("name" IS NOT NULL OR "userId" IS NOT NULL);
