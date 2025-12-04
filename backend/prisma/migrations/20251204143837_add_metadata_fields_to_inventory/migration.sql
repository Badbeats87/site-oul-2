-- AlterTable
ALTER TABLE "inventory_lots" ADD COLUMN     "country" VARCHAR(100),
ADD COLUMN     "format" VARCHAR(100),
ADD COLUMN     "release_status" VARCHAR(50),
ADD COLUMN     "styles" VARCHAR(255);
