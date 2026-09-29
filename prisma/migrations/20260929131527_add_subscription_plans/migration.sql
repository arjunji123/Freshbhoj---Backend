-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "planId" TEXT;

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billingCycle" "SubscriptionBillingCycle" NOT NULL,
    "deliveryDays" "DayOfWeek"[],
    "mealsPerDay" INTEGER NOT NULL DEFAULT 1,
    "priceRs" INTEGER NOT NULL,
    "originalPriceRs" INTEGER,
    "dietOptions" "FoodType"[],
    "jainAvailable" BOOLEAN NOT NULL DEFAULT false,
    "slotOptions" "MealSlot"[],
    "includesDescription" TEXT NOT NULL,
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_plans_kitchenId_isActive_idx" ON "subscription_plans"("kitchenId", "isActive");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plans" ADD CONSTRAINT "subscription_plans_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;
