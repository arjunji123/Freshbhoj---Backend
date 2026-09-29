-- CreateEnum
CREATE TYPE "CustomerWalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "CustomerWalletTransactionReason" AS ENUM ('TOPUP', 'ORDER_PAYMENT', 'SUBSCRIPTION_PAYMENT', 'WITHDRAWAL', 'REFUND');

-- CreateEnum
CREATE TYPE "CustomerWalletWithdrawalStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'FAILED');

-- AlterEnum
ALTER TYPE "CoinTransactionReason" ADD VALUE 'SUBSCRIPTION_REDEMPTION';

-- AlterTable
ALTER TABLE "subscription_deliveries" ADD COLUMN     "mealId" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "addressId" TEXT,
ADD COLUMN     "addressSnapshot" JSONB,
ADD COLUMN     "pausedUntil" DATE,
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI';

-- CreateTable
CREATE TABLE "customer_wallets" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balanceRs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "CustomerWalletTransactionType" NOT NULL,
    "reason" "CustomerWalletTransactionReason" NOT NULL,
    "amountRs" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_wallet_withdrawals" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amountRs" INTEGER NOT NULL,
    "status" "CustomerWalletWithdrawalStatus" NOT NULL DEFAULT 'REQUESTED',
    "destination" JSONB NOT NULL,
    "failureReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "customer_wallet_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_wallets_userId_key" ON "customer_wallets"("userId");

-- CreateIndex
CREATE INDEX "customer_wallet_transactions_walletId_createdAt_idx" ON "customer_wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "customer_wallet_withdrawals_walletId_status_idx" ON "customer_wallet_withdrawals"("walletId", "status");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_deliveries" ADD CONSTRAINT "subscription_deliveries_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_wallets" ADD CONSTRAINT "customer_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_wallet_transactions" ADD CONSTRAINT "customer_wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "customer_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_wallet_withdrawals" ADD CONSTRAINT "customer_wallet_withdrawals_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "customer_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
