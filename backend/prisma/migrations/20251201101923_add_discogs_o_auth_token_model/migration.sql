-- CreateTable
CREATE TABLE "discogs_oauth_tokens" (
    "id" UUID NOT NULL,
    "access_token" VARCHAR(500) NOT NULL,
    "access_token_secret" VARCHAR(500) NOT NULL,
    "discogs_username" VARCHAR(255),
    "discogs_user_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "obtained_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "discogs_oauth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "discogs_oauth_tokens_access_token_key" ON "discogs_oauth_tokens"("access_token");

-- CreateIndex
CREATE INDEX "discogs_oauth_tokens_is_active_created_at_idx" ON "discogs_oauth_tokens"("is_active", "created_at" DESC);

-- CreateIndex
CREATE INDEX "discogs_oauth_tokens_discogs_username_idx" ON "discogs_oauth_tokens"("discogs_username");
