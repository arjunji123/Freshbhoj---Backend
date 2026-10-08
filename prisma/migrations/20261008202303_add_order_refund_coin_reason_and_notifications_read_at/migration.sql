-- AlterEnum
ALTER TYPE "CoinTransactionReason" ADD VALUE 'ORDER_REFUND';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "notificationsReadAt" TIMESTAMP(3);
