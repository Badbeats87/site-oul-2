-- CreateIndex
CREATE INDEX "releases_release_year_idx" ON "releases"("release_year");

-- CreateIndex
CREATE INDEX "releases_created_at_idx" ON "releases"("created_at");

-- CreateIndex
CREATE INDEX "releases_genre_release_year_idx" ON "releases"("genre", "release_year");
