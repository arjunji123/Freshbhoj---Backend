-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WalletTransactionReason" AS ENUM ('TOPUP', 'AD_BOOST', 'PREMIUM_PLAN');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('BUDGET_INCREASE', 'DELIVERY_RADIUS', 'TARGET_CUISINE', 'CREATIVE_REFRESH');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('NEW', 'APPLIED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "PremiumTier" AS ENUM ('BASIC', 'PRO', 'ELITE');

-- CreateEnum
CREATE TYPE "PremiumSubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- AlterTable
ALTER TABLE "reel_campaigns" ADD COLUMN     "durationDays" INTEGER;

-- CreateTable
CREATE TABLE "kitchen_wallets" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "balanceRs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "reason" "WalletTransactionReason" NOT NULL,
    "amountRs" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_suggestions" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "campaignId" TEXT,
    "type" "SuggestionType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" JSONB NOT NULL,
    "reasoning" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'NEW',
    "appliedChanges" JSONB,
    "batchDate" DATE NOT NULL,
    "appliedAt" TIMESTAMP(3),
    "dismissedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_premium_subscriptions" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "tier" "PremiumTier" NOT NULL,
    "status" "PremiumSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "priceRs" INTEGER NOT NULL,
    "currentPeriodEnd" DATE NOT NULL,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_premium_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_wallets_kitchenId_key" ON "kitchen_wallets"("kitchenId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "campaign_suggestions_kitchenId_status_idx" ON "campaign_suggestions"("kitchenId", "status");

-- CreateIndex
CREATE INDEX "campaign_suggestions_kitchenId_batchDate_idx" ON "campaign_suggestions"("kitchenId", "batchDate");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_premium_subscriptions_kitchenId_key" ON "kitchen_premium_subscriptions"("kitchenId");

-- AddForeignKey
ALTER TABLE "kitchen_wallets" ADD CONSTRAINT "kitchen_wallets_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "kitchen_wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_suggestions" ADD CONSTRAINT "campaign_suggestions_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_suggestions" ADD CONSTRAINT "campaign_suggestions_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "reel_campaigns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_premium_subscriptions" ADD CONSTRAINT "kitchen_premium_subscriptions_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
