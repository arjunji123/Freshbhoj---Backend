-- CreateEnum
CREATE TYPE "KitchenAccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ONBOARDING', 'UNDER_REVIEW', 'ACTIVE', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "KitchenOnboardingStep" AS ENUM ('PHONE_VERIFIED', 'OWNER_DETAILS', 'KITCHEN_DETAILS', 'LOCATION', 'DOCUMENTS', 'BANK_DETAILS', 'MENU_SETUP', 'SUBMITTED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "KitchenDocumentType" AS ENUM ('FSSAI', 'GST', 'PAN', 'AADHAAR', 'SHOP_LICENSE', 'BANK_PROOF', 'KITCHEN_PHOTOS');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CardBrand" AS ENUM ('VISA', 'MASTERCARD', 'RUPAY', 'AMEX', 'DINERS', 'UNKNOWN');

-- AlterTable
ALTER TABLE "kitchens" ADD COLUMN     "accountId" TEXT;

-- AlterTable
ALTER TABLE "meals" ADD COLUMN     "cuisineId" TEXT;

-- CreateTable
CREATE TABLE "kitchen_accounts" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "ownerName" TEXT,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "KitchenAccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "onboardingStep" "KitchenOnboardingStep" NOT NULL DEFAULT 'PHONE_VERIFIED',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "fcmToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "deviceInfo" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_documents" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "type" "KitchenDocumentType" NOT NULL,
    "number" TEXT,
    "fileUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_bank_accounts" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountHolderName" TEXT NOT NULL,
    "accountNumberLast4" TEXT NOT NULL,
    "ifsc" TEXT NOT NULL,
    "bankName" TEXT,
    "upiId" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cuisines" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cuisines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_stories" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL DEFAULT 'VIDEO',
    "mediaUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "mealId" TEXT,
    "city" TEXT NOT NULL,
    "durationSec" INTEGER NOT NULL DEFAULT 15,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_stories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_story_views" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_story_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_cards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brand" "CardBrand" NOT NULL DEFAULT 'UNKNOWN',
    "last4" TEXT NOT NULL,
    "expiryMonth" INTEGER NOT NULL,
    "expiryYear" INTEGER NOT NULL,
    "holderName" TEXT,
    "gatewayToken" TEXT NOT NULL,
    "gateway" TEXT NOT NULL DEFAULT 'razorpay',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_accounts_phone_key" ON "kitchen_accounts"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_accounts_email_key" ON "kitchen_accounts"("email");

-- CreateIndex
CREATE INDEX "kitchen_accounts_status_idx" ON "kitchen_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_refresh_tokens_token_key" ON "kitchen_refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "kitchen_refresh_tokens_accountId_idx" ON "kitchen_refresh_tokens"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_documents_accountId_type_key" ON "kitchen_documents"("accountId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_bank_accounts_accountId_key" ON "kitchen_bank_accounts"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "cuisines_slug_key" ON "cuisines"("slug");

-- CreateIndex
CREATE INDEX "cuisines_isActive_sortOrder_idx" ON "cuisines"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "kitchen_stories_city_isActive_expiresAt_idx" ON "kitchen_stories"("city", "isActive", "expiresAt");

-- CreateIndex
CREATE INDEX "kitchen_stories_kitchenId_expiresAt_idx" ON "kitchen_stories"("kitchenId", "expiresAt");

-- CreateIndex
CREATE INDEX "kitchen_story_views_userId_idx" ON "kitchen_story_views"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_story_views_storyId_userId_key" ON "kitchen_story_views"("storyId", "userId");

-- CreateIndex
CREATE INDEX "saved_cards_userId_isDefault_idx" ON "saved_cards"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "saved_cards_userId_gatewayToken_key" ON "saved_cards"("userId", "gatewayToken");

-- CreateIndex
CREATE UNIQUE INDEX "kitchens_accountId_key" ON "kitchens"("accountId");

-- CreateIndex
CREATE INDEX "meals_cuisineId_idx" ON "meals"("cuisineId");

-- AddForeignKey
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "kitchen_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_cuisineId_fkey" FOREIGN KEY ("cuisineId") REFERENCES "cuisines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_refresh_tokens" ADD CONSTRAINT "kitchen_refresh_tokens_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "kitchen_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_documents" ADD CONSTRAINT "kitchen_documents_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "kitchen_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_bank_accounts" ADD CONSTRAINT "kitchen_bank_accounts_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "kitchen_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_stories" ADD CONSTRAINT "kitchen_stories_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_stories" ADD CONSTRAINT "kitchen_stories_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_story_views" ADD CONSTRAINT "kitchen_story_views_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "kitchen_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_story_views" ADD CONSTRAINT "kitchen_story_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_cards" ADD CONSTRAINT "saved_cards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

