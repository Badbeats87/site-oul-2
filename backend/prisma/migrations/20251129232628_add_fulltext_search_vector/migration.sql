-- Add tsvector column for full-text search
ALTER TABLE "releases" ADD COLUMN "search_vector" tsvector;

-- Create GIN index for fast full-text search queries
CREATE INDEX "idx_releases_search_vector" ON "releases" USING GIN ("search_vector");

-- Create trigger function to automatically update search_vector
CREATE OR REPLACE FUNCTION update_releases_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW."search_vector" :=
    setweight(to_tsvector('english', COALESCE(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."artist", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW."label", '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW."description", '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW."genre", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update search_vector on insert/update
CREATE TRIGGER trg_update_releases_search_vector
BEFORE INSERT OR UPDATE ON "releases"
FOR EACH ROW
EXECUTE FUNCTION update_releases_search_vector();

-- Populate search_vector for existing records
UPDATE "releases" SET "search_vector" =
  setweight(to_tsvector('english', COALESCE("title", '')), 'A') ||
  setweight(to_tsvector('english', COALESCE("artist", '')), 'A') ||
  setweight(to_tsvector('english', COALESCE("label", '')), 'B') ||
  setweight(to_tsvector('english', COALESCE("description", '')), 'C') ||
  setweight(to_tsvector('english', COALESCE("genre", '')), 'B');
