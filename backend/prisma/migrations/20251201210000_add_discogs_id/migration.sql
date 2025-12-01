-- Add discogsId column to releases table
ALTER TABLE "releases" ADD COLUMN "discogs_id" INTEGER UNIQUE;

-- Create index on discogs_id for fast lookups
CREATE INDEX "releases_discogs_id_idx" ON "releases"("discogs_id");
