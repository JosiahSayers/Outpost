-- CreateTable
CREATE TABLE "GearCategory" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT false,
    "data_fts" tsvector GENERATED ALWAYS AS (to_tsvector('english', coalesce(name, ''))) STORED,

    CONSTRAINT "GearCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GearCategory_data_fts_idx" ON "GearCategory" USING GIN ("data_fts");
