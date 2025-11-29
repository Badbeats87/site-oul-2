-- CreateEnum
CREATE TYPE "PolicyScope" AS ENUM ('GLOBAL', 'GENRE', 'RELEASE', 'CHANNEL');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING_REVIEW', 'COUNTER_OFFERED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'REJECTED', 'EXPIRED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COUNTER_OFFERED', 'REJECTED', 'CONVERTED_TO_INVENTORY');

-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('DRAFT', 'LIVE', 'RESERVED', 'SOLD', 'REMOVED', 'RETURNED');

-- CreateEnum
CREATE TYPE "VinylCondition" AS ENUM ('MINT', 'NM', 'VG_PLUS', 'VG', 'VG_MINUS', 'G', 'FAIR', 'POOR');

-- CreateTable
CREATE TABLE "pricing_policies" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "scope" "PolicyScope" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "buy_formula" JSONB NOT NULL,
    "sell_formula" JSONB NOT NULL,
    "condition_curve" JSONB NOT NULL,
    "min_offer" DECIMAL(10,2),
    "max_offer" DECIMAL(10,2),
    "offer_expiry_days" INTEGER NOT NULL DEFAULT 30,
    "genre_scope" VARCHAR(100),
    "channel_scope" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID,

    CONSTRAINT "pricing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "release_pricing_policies" (
    "id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "release_pricing_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pricing_policy_audits" (
    "id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "change_type" VARCHAR(50) NOT NULL,
    "previous_version" INTEGER,
    "new_version" INTEGER NOT NULL,
    "changes" JSONB NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pricing_policy_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_submissions" (
    "id" UUID NOT NULL,
    "seller_contact" VARCHAR(255) NOT NULL,
    "seller_name" VARCHAR(255),
    "seller_notes" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "total_offered" DECIMAL(10,2),
    "total_accepted" DECIMAL(10,2),
    "channel" VARCHAR(50),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "reviewed_at" TIMESTAMPTZ,
    "reviewed_by" UUID,

    CONSTRAINT "seller_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_items" (
    "id" UUID NOT NULL,
    "submission_id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "seller_condition_media" "VinylCondition" NOT NULL,
    "seller_condition_sleeve" "VinylCondition" NOT NULL,
    "auto_offer_price" DECIMAL(10,2) NOT NULL,
    "counter_offer_price" DECIMAL(10,2),
    "final_offer_price" DECIMAL(10,2),
    "policy_id_used" UUID,
    "policy_version_used" INTEGER,
    "status" "ItemStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "submission_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_lots" (
    "id" UUID NOT NULL,
    "release_id" UUID NOT NULL,
    "submission_item_id" UUID,
    "condition_media" "VinylCondition" NOT NULL,
    "condition_sleeve" "VinylCondition" NOT NULL,
    "cost_basis" DECIMAL(10,2) NOT NULL,
    "list_price" DECIMAL(10,2) NOT NULL,
    "sale_price" DECIMAL(10,2),
    "channel" VARCHAR(50),
    "status" "LotStatus" NOT NULL DEFAULT 'DRAFT',
    "sku" VARCHAR(100),
    "internal_notes" TEXT,
    "public_description" TEXT,
    "photo_urls" JSONB,
    "reserved_at" TIMESTAMPTZ,
    "sold_at" TIMESTAMPTZ,
    "order_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "listed_at" TIMESTAMPTZ,

    CONSTRAINT "inventory_lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pricing_policies_scope_is_active_idx" ON "pricing_policies"("scope", "is_active");

-- CreateIndex
CREATE INDEX "pricing_policies_genre_scope_is_active_idx" ON "pricing_policies"("genre_scope", "is_active");

-- CreateIndex
CREATE INDEX "release_pricing_policies_release_id_is_active_idx" ON "release_pricing_policies"("release_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "release_pricing_policies_release_id_policy_id_key" ON "release_pricing_policies"("release_id", "policy_id");

-- CreateIndex
CREATE INDEX "pricing_policy_audits_policy_id_changed_at_idx" ON "pricing_policy_audits"("policy_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "seller_submissions_status_created_at_idx" ON "seller_submissions"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "seller_submissions_seller_contact_idx" ON "seller_submissions"("seller_contact");

-- CreateIndex
CREATE INDEX "seller_submissions_expires_at_idx" ON "seller_submissions"("expires_at");

-- CreateIndex
CREATE INDEX "submission_items_submission_id_idx" ON "submission_items"("submission_id");

-- CreateIndex
CREATE INDEX "submission_items_release_id_idx" ON "submission_items"("release_id");

-- CreateIndex
CREATE INDEX "submission_items_status_idx" ON "submission_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_lots_sku_key" ON "inventory_lots"("sku");

-- CreateIndex
CREATE INDEX "inventory_lots_release_id_status_idx" ON "inventory_lots"("release_id", "status");

-- CreateIndex
CREATE INDEX "inventory_lots_status_listed_at_idx" ON "inventory_lots"("status", "listed_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_lots_sku_idx" ON "inventory_lots"("sku");

-- AddForeignKey
ALTER TABLE "release_pricing_policies" ADD CONSTRAINT "release_pricing_policies_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "release_pricing_policies" ADD CONSTRAINT "release_pricing_policies_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "pricing_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_policy_audits" ADD CONSTRAINT "pricing_policy_audits_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "pricing_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_items" ADD CONSTRAINT "submission_items_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "seller_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_items" ADD CONSTRAINT "submission_items_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_submission_item_id_fkey" FOREIGN KEY ("submission_item_id") REFERENCES "submission_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;
