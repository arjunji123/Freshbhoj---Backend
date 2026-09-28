-- CreateEnum
CREATE TYPE "KitchenType" AS ENUM ('HOME_KITCHEN', 'CLOUD_KITCHEN', 'RESTAURANT', 'TIFFIN_SERVICE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "KitchenDocumentType" ADD VALUE 'KITCHEN_PHOTO_FRONT';
ALTER TYPE "KitchenDocumentType" ADD VALUE 'KITCHEN_PHOTO_MAIN';

-- AlterTable
ALTER TABLE "kitchens" ADD COLUMN     "kitchenType" "KitchenType",
ADD COLUMN     "serviceRadiusKm" DOUBLE PRECISION;
