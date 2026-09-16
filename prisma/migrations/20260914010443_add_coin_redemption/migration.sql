-- AlterEnum
ALTER TYPE "CoinTransactionReason" ADD VALUE 'ORDER_REDEMPTION';

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "coinsToRedeem" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "coinsRedeemed" INTEGER NOT NULL DEFAULT 0;

