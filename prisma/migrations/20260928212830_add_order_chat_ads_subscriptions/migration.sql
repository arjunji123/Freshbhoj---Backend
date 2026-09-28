-- CreateEnum
CREATE TYPE "ChatSenderType" AS ENUM ('KITCHEN', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "ReelCampaignStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SubscriptionBillingCycle" AS ENUM ('WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DeliveryScheduleStatus" AS ENUM ('SCHEDULED', 'DISPATCHED', 'SKIPPED');

-- CreateTable
CREATE TABLE "order_messages" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sender" "ChatSenderType" NOT NULL,
    "body" TEXT NOT NULL,
    "triggeredStatus" "OrderStatus",
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_campaigns" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "dailyBudgetRs" INTEGER NOT NULL,
    "endDate" DATE,
    "status" "ReelCampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "accrualAnchor" DATE NOT NULL,
    "accruedSpendRs" INTEGER NOT NULL DEFAULT 0,
    "pausedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reel_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_campaign_daily_stats" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reel_campaign_daily_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "foodType" "FoodType" NOT NULL,
    "mealsPerDay" INTEGER NOT NULL DEFAULT 1,
    "deliveryDays" "DayOfWeek"[],
    "deliveryTime" "MealSlot" NOT NULL,
    "billingCycle" "SubscriptionBillingCycle" NOT NULL DEFAULT 'WEEKLY',
    "pricePerCycle" INTEGER NOT NULL,
    "specialInstructions" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "startDate" DATE NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "pausedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_deliveries" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "DeliveryScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "dispatchedAt" TIMESTAMP(3),
    "skipReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_billing_events" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "cycleStart" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_messages_orderId_createdAt_idx" ON "order_messages"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "reel_campaigns_kitchenId_status_idx" ON "reel_campaigns"("kitchenId", "status");

-- CreateIndex
CREATE INDEX "reel_campaigns_reelId_status_idx" ON "reel_campaigns"("reelId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "reel_campaign_daily_stats_campaignId_date_key" ON "reel_campaign_daily_stats"("campaignId", "date");

-- CreateIndex
CREATE INDEX "subscriptions_kitchenId_status_idx" ON "subscriptions"("kitchenId", "status");

-- CreateIndex
CREATE INDEX "subscriptions_userId_idx" ON "subscriptions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_deliveries_subscriptionId_date_key" ON "subscription_deliveries"("subscriptionId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_billing_events_subscriptionId_cycleStart_key" ON "subscription_billing_events"("subscriptionId", "cycleStart");

-- AddForeignKey
ALTER TABLE "order_messages" ADD CONSTRAINT "order_messages_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_campaigns" ADD CONSTRAINT "reel_campaigns_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_campaigns" ADD CONSTRAINT "reel_campaigns_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_campaign_daily_stats" ADD CONSTRAINT "reel_campaign_daily_stats_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "reel_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_deliveries" ADD CONSTRAINT "subscription_deliveries_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_billing_events" ADD CONSTRAINT "subscription_billing_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
