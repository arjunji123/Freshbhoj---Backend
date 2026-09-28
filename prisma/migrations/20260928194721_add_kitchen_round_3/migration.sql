-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BhojAiMessageRole" AS ENUM ('USER', 'MODEL', 'FUNCTION');

-- CreateEnum
CREATE TYPE "EscalationStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('ORDER', 'SUBSCRIPTION', 'REEL', 'GENERAL');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('REQUESTED', 'PROCESSING', 'PAID', 'FAILED');

-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "sourceReelId" TEXT;

-- AlterTable
ALTER TABLE "kitchens" ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "specialities" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "meals" ADD COLUMN     "isJainAvailable" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "sourceReelId" TEXT;

-- AlterTable
ALTER TABLE "reels" ADD COLUMN     "isPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isSponsored" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "kitchen_operating_hours" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "session1Start" TEXT,
    "session1End" TEXT,
    "session2Start" TEXT,
    "session2End" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_operating_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_holiday_overrides" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT true,
    "session1Start" TEXT,
    "session1End" TEXT,
    "session2Start" TEXT,
    "session2End" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_holiday_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bhojai_conversations" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bhojai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bhojai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "BhojAiMessageRole" NOT NULL,
    "text" TEXT,
    "functionCall" JSONB,
    "functionResult" JSONB,
    "card" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bhojai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bhojai_escalations" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "conversationId" TEXT,
    "reason" TEXT NOT NULL,
    "status" "EscalationStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "bhojai_escalations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'REQUESTED',
    "bankAccountSnapshot" JSONB NOT NULL,
    "transferRef" TEXT,
    "failureReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_operating_hours_kitchenId_dayOfWeek_key" ON "kitchen_operating_hours"("kitchenId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "kitchen_holiday_overrides_kitchenId_date_idx" ON "kitchen_holiday_overrides"("kitchenId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_holiday_overrides_kitchenId_date_key" ON "kitchen_holiday_overrides"("kitchenId", "date");

-- CreateIndex
CREATE INDEX "bhojai_conversations_accountId_status_idx" ON "bhojai_conversations"("accountId", "status");

-- CreateIndex
CREATE INDEX "bhojai_messages_conversationId_createdAt_idx" ON "bhojai_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "bhojai_escalations_status_createdAt_idx" ON "bhojai_escalations"("status", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_accountId_isRead_createdAt_idx" ON "notifications"("accountId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_accountId_category_createdAt_idx" ON "notifications"("accountId", "category", "createdAt");

-- CreateIndex
CREATE INDEX "payouts_accountId_status_idx" ON "payouts"("accountId", "status");

-- AddForeignKey
ALTER TABLE "kitchen_operating_hours" ADD CONSTRAINT "kitchen_operating_hours_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_holiday_overrides" ADD CONSTRAINT "kitchen_holiday_overrides_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bhojai_conversations" ADD CONSTRAINT "bhojai_conversations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "kitchen_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bhojai_messages" ADD CONSTRAINT "bhojai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "bhojai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bhojai_escalations" ADD CONSTRAINT "bhojai_escalations_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "kitchen_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bhojai_escalations" ADD CONSTRAINT "bhojai_escalations_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "bhojai_conversations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "kitchen_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "kitchen_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
