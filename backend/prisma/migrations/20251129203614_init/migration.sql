-- CreateEnum
CREATE TYPE "MarketSource" AS ENUM ('DISCOGS', 'EBAY', 'HYBRID', 'MANUAL');

-- CreateTable
CREATE TABLE "releases" (
    "id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "artist" VARCHAR(500) NOT NULL,
    "label" VARCHAR(255),
    "catalog_number" VARCHAR(100),
    "barcode" VARCHAR(50),
    "release_year" INTEGER,
    "genre" VARCHAR(100),
    "cover_art_url" VARCHAR(1000),
    "description" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_snapshots" (
    "id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "source" "MarketSource" NOT NULL,
    "stat_low" DECIMAL(10,2),
    "stat_median" DECIMAL(10,2),
    "stat_high" DECIMAL(10,2),
    "sample_size" INTEGER,
    "fetched_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "last_login_at" TIMESTAMPTZ,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "releases_artist_title_idx" ON "releases"("artist", "title");

-- CreateIndex
CREATE INDEX "releases_barcode_idx" ON "releases"("barcode");

-- CreateIndex
CREATE INDEX "releases_catalog_number_idx" ON "releases"("catalog_number");

-- CreateIndex
CREATE INDEX "releases_genre_idx" ON "releases"("genre");

-- CreateIndex
CREATE INDEX "market_snapshots_release_id_fetched_at_idx" ON "market_snapshots"("release_id", "fetched_at" DESC);

-- CreateIndex
CREATE INDEX "market_snapshots_source_fetched_at_idx" ON "market_snapshots"("source", "fetched_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");

-- AddForeignKey
ALTER TABLE "market_snapshots" ADD CONSTRAINT "market_snapshots_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
