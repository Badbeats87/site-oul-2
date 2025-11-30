-- CreateEnum
CREATE TYPE "ShippingMethod" AS ENUM ('STANDARD', 'EXPRESS', 'OVERNIGHT');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING_LABEL', 'LABEL_GENERATED', 'READY_TO_SHIP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED_DELIVERY', 'RETURNED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "ShippingCarrier" AS ENUM ('MOCK', 'USPS', 'UPS', 'FEDEX', 'DHL');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "shipping_method" "ShippingMethod";

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "shipment_status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING_LABEL',
    "carrier" "ShippingCarrier" NOT NULL,
    "shipping_method" "ShippingMethod" NOT NULL,
    "tracking_number" VARCHAR(100),
    "tracking_url" VARCHAR(500),
    "label_url" VARCHAR(500),
    "label_format" VARCHAR(20),
    "weight_oz" INTEGER NOT NULL,
    "packageType" VARCHAR(50) NOT NULL DEFAULT 'PACKAGE',
    "dimensions" JSONB,
    "base_rate" DECIMAL(10,2) NOT NULL,
    "insurance_cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(10,2) NOT NULL,
    "from_address" JSONB NOT NULL,
    "to_address" JSONB NOT NULL,
    "provider_shipment_id" VARCHAR(100),
    "provider_rate_id" VARCHAR(100),
    "provider_metadata" JSONB,
    "approved_for_shipment" BOOLEAN NOT NULL DEFAULT false,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "packed_by" UUID,
    "packed_at" TIMESTAMPTZ,
    "estimated_delivery_date" TIMESTAMPTZ,
    "actual_delivery_date" TIMESTAMPTZ,
    "signature_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "shipped_at" TIMESTAMPTZ,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_tracking" (
    "id" UUID NOT NULL,
    "shipment_id" UUID NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "status_detail" VARCHAR(255),
    "location" VARCHAR(255),
    "event_time" TIMESTAMPTZ NOT NULL,
    "message" TEXT,
    "carrier_event_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_tracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_zones" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "states_included" TEXT[],
    "zip_ranges" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shipping_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipping_rates" (
    "id" UUID NOT NULL,
    "zone_id" UUID NOT NULL,
    "shipping_method" "ShippingMethod" NOT NULL,
    "carrier" "ShippingCarrier" NOT NULL,
    "min_weight_oz" INTEGER NOT NULL,
    "max_weight_oz" INTEGER NOT NULL,
    "base_rate" DECIMAL(10,2) NOT NULL,
    "per_oz_rate" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "min_days" INTEGER NOT NULL,
    "max_days" INTEGER NOT NULL,
    "effective_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiration_date" TIMESTAMPTZ,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shipping_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_tracking_number_key" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipments_shipment_status_created_at_idx" ON "shipments"("shipment_status", "created_at" DESC);

-- CreateIndex
CREATE INDEX "shipments_tracking_number_idx" ON "shipments"("tracking_number");

-- CreateIndex
CREATE INDEX "shipments_carrier_shipment_status_idx" ON "shipments"("carrier", "shipment_status");

-- CreateIndex
CREATE INDEX "shipment_tracking_shipment_id_event_time_idx" ON "shipment_tracking"("shipment_id", "event_time" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "shipping_zones_name_key" ON "shipping_zones"("name");

-- CreateIndex
CREATE INDEX "shipping_zones_priority_is_active_idx" ON "shipping_zones"("priority", "is_active");

-- CreateIndex
CREATE INDEX "shipping_rates_zone_id_shipping_method_is_active_idx" ON "shipping_rates"("zone_id", "shipping_method", "is_active");

-- CreateIndex
CREATE INDEX "shipping_rates_min_weight_oz_max_weight_oz_idx" ON "shipping_rates"("min_weight_oz", "max_weight_oz");

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_tracking" ADD CONSTRAINT "shipment_tracking_shipment_id_fkey" FOREIGN KEY ("shipment_id") REFERENCES "shipments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipping_rates" ADD CONSTRAINT "shipping_rates_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "shipping_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
