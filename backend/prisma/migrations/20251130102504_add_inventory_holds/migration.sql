-- CreateEnum
CREATE TYPE "HoldStatus" AS ENUM ('ACTIVE', 'RELEASED', 'EXPIRED', 'CONVERTED_TO_SALE');

-- CreateTable
CREATE TABLE "inventory_holds" (
    "id" UUID NOT NULL,
    "inventory_lot_id" UUID NOT NULL,
    "order_id" UUID,
    "session_id" VARCHAR(255),
    "hold_status" "HoldStatus" NOT NULL DEFAULT 'ACTIVE',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "released_at" TIMESTAMPTZ,
    "released_reason" VARCHAR(255),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "inventory_holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_hold_audits" (
    "id" UUID NOT NULL,
    "hold_id" UUID NOT NULL,
    "from_status" "HoldStatus" NOT NULL,
    "to_status" "HoldStatus" NOT NULL,
    "reason" VARCHAR(255),
    "changed_by" UUID,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_hold_audits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_holds_inventory_lot_id_hold_status_idx" ON "inventory_holds"("inventory_lot_id", "hold_status");

-- CreateIndex
CREATE INDEX "inventory_holds_order_id_hold_status_idx" ON "inventory_holds"("order_id", "hold_status");

-- CreateIndex
CREATE INDEX "inventory_holds_session_id_hold_status_idx" ON "inventory_holds"("session_id", "hold_status");

-- CreateIndex
CREATE INDEX "inventory_holds_expires_at_hold_status_idx" ON "inventory_holds"("expires_at", "hold_status");

-- CreateIndex
CREATE INDEX "inventory_holds_hold_status_created_at_idx" ON "inventory_holds"("hold_status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_hold_audits_hold_id_changed_at_idx" ON "inventory_hold_audits"("hold_id", "changed_at" DESC);

-- CreateIndex
CREATE INDEX "inventory_hold_audits_changed_at_idx" ON "inventory_hold_audits"("changed_at" DESC);

-- AddForeignKey
ALTER TABLE "inventory_holds" ADD CONSTRAINT "inventory_holds_inventory_lot_id_fkey" FOREIGN KEY ("inventory_lot_id") REFERENCES "inventory_lots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_holds" ADD CONSTRAINT "inventory_holds_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
