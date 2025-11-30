-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CART', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PAYMENT_FAILED', 'REFUNDED');

-- DropIndex
DROP INDEX "idx_releases_search_vector";

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "orderNumber" VARCHAR(50) NOT NULL,
    "buyerEmail" VARCHAR(255) NOT NULL,
    "buyerName" VARCHAR(255),
    "buyerId" UUID,
    "status" "OrderStatus" NOT NULL DEFAULT 'CART',
    "subtotal" DECIMAL(10,2) NOT NULL,
    "tax" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "shipping" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(10,2) NOT NULL,
    "stripe_payment_intent_id" VARCHAR(255),
    "stripe_payment_status" VARCHAR(50),
    "payment_method" VARCHAR(50),
    "shippingAddress" JSONB,
    "sessionId" VARCHAR(255),
    "ipAddress" VARCHAR(50),
    "userAgent" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "checkout_started_at" TIMESTAMPTZ,
    "payment_confirmed_at" TIMESTAMPTZ,
    "shipped_at" TIMESTAMPTZ,
    "delivered_at" TIMESTAMPTZ,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "inventory_lot_id" UUID NOT NULL,
    "price_at_purchase" DECIMAL(10,2) NOT NULL,
    "release_title" VARCHAR(500) NOT NULL,
    "release_artist" VARCHAR(500) NOT NULL,
    "condition_media" "VinylCondition" NOT NULL,
    "condition_sleeve" "VinylCondition" NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_audits" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "from_status" "OrderStatus" NOT NULL,
    "to_status" "OrderStatus" NOT NULL,
    "change_reason" VARCHAR(255),
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripe_payment_intent_id_key" ON "orders"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "orders_buyerEmail_idx" ON "orders"("buyerEmail");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "orders_stripe_payment_intent_id_idx" ON "orders"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "orders_sessionId_idx" ON "orders"("sessionId");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_inventory_lot_id_idx" ON "order_items"("inventory_lot_id");

-- CreateIndex
CREATE INDEX "order_audits_order_id_changed_at_idx" ON "order_audits"("order_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "order_audits_changed_at_idx" ON "order_audits"("changed_at" DESC);

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_inventory_lot_id_fkey" FOREIGN KEY ("inventory_lot_id") REFERENCES "inventory_lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_audits" ADD CONSTRAINT "order_audits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
