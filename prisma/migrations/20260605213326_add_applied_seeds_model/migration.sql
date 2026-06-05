-- CreateTable
CREATE TABLE "AppliedSeeds" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppliedSeeds_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppliedSeeds_name_key" ON "AppliedSeeds"("name");
