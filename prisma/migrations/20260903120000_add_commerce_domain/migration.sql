-- CreateEnum
CREATE TYPE "KitchenStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MealSlot" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS');

-- CreateEnum
CREATE TYPE "FoodType" AS ENUM ('VEG', 'EGG', 'NON_VEG', 'VEGAN');

-- CreateEnum
CREATE TYPE "GoalTag" AS ENUM ('HIGH_PROTEIN', 'LOW_CALORIE', 'WEIGHT_LOSS', 'MUSCLE_GAIN', 'HEALTHY_LIFESTYLE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PLACED', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('UPI', 'CARD', 'WALLET', 'COD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "AddressLabel" AS ENUM ('HOME', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "DeliverySlotType" AS ENUM ('NOW', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "ReelStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CouponType" AS ENUM ('FLAT', 'PERCENT');

-- CreateTable
CREATE TABLE "serviceable_areas" (
    "id" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Rajasthan',
    "locality" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "serviceable_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchens" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "logoUrl" TEXT,
    "coverImage" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "status" "KitchenStatus" NOT NULL DEFAULT 'ACTIVE',
    "fssaiLicense" TEXT,
    "hygieneScore" DOUBLE PRECISION,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "addressLine" TEXT,
    "locality" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Jaipur',
    "state" TEXT NOT NULL DEFAULT 'Rajasthan',
    "pincode" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "prepTimeMins" INTEGER NOT NULL DEFAULT 30,
    "opensAt" TEXT NOT NULL DEFAULT '08:00',
    "closesAt" TEXT NOT NULL DEFAULT '22:00',
    "isAcceptingOrders" BOOLEAN NOT NULL DEFAULT true,
    "contactPhone" TEXT,
    "ownerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_media" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "type" "MediaType" NOT NULL DEFAULT 'IMAGE',
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_follows" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_categories" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "slot" "MealSlot",
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meals" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "price" INTEGER NOT NULL,
    "mrp" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "isBestseller" BOOLEAN NOT NULL DEFAULT false,
    "foodType" "FoodType" NOT NULL DEFAULT 'VEG',
    "slots" "MealSlot"[] DEFAULT ARRAY[]::"MealSlot"[],
    "goalTags" "GoalTag"[] DEFAULT ARRAY[]::"GoalTag"[],
    "calories" INTEGER,
    "proteinG" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "fiberG" DOUBLE PRECISION,
    "servingSize" TEXT,
    "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "allergens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prepTimeMins" INTEGER NOT NULL DEFAULT 25,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "orderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_customization_groups" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "minSelect" INTEGER NOT NULL DEFAULT 0,
    "maxSelect" INTEGER NOT NULL DEFAULT 5,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meal_customization_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meal_customization_options" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "meal_customization_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "label" "AddressLabel" NOT NULL DEFAULT 'HOME',
    "customLabel" TEXT,
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "landmark" TEXT,
    "locality" TEXT,
    "city" TEXT NOT NULL DEFAULT 'Jaipur',
    "state" TEXT NOT NULL DEFAULT 'Rajasthan',
    "pincode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "couponCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "customizationIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialInstructions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "CouponType" NOT NULL DEFAULT 'FLAT',
    "value" INTEGER NOT NULL,
    "minOrderValue" INTEGER NOT NULL DEFAULT 0,
    "maxDiscount" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTill" TIMESTAMP(3) NOT NULL,
    "usageLimit" INTEGER,
    "perUserLimit" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "photoUrl" TEXT,
    "vehicleNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "delivery_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "addressId" TEXT,
    "addressSnapshot" JSONB NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "itemsTotal" INTEGER NOT NULL,
    "deliveryFee" INTEGER NOT NULL DEFAULT 0,
    "taxes" INTEGER NOT NULL DEFAULT 0,
    "discount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" INTEGER NOT NULL,
    "couponCode" TEXT,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'UPI',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paymentRef" TEXT,
    "slotType" "DeliverySlotType" NOT NULL DEFAULT 'NOW',
    "scheduledFor" TIMESTAMP(3),
    "orderNotes" TEXT,
    "etaMinutes" INTEGER NOT NULL DEFAULT 30,
    "placedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "deliveryPartnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "mealId" TEXT,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "unitPrice" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "customizations" JSONB NOT NULL DEFAULT '[]',
    "lineTotal" INTEGER NOT NULL,
    "specialInstructions" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "mealId" TEXT,
    "orderId" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reels" (
    "id" TEXT NOT NULL,
    "kitchenId" TEXT NOT NULL,
    "mealId" TEXT,
    "videoUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "caption" TEXT,
    "hashtags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "status" "ReelStatus" NOT NULL DEFAULT 'PUBLISHED',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "commentCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_likes" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reel_saves" (
    "id" TEXT NOT NULL,
    "reelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reel_saves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "promotions" BOOLEAN NOT NULL DEFAULT true,
    "newKitchens" BOOLEAN NOT NULL DEFAULT true,
    "reelActivity" BOOLEAN NOT NULL DEFAULT false,
    "whatsappUpdates" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "faq_items" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "serviceable_areas_pincode_idx" ON "serviceable_areas"("pincode");

-- CreateIndex
CREATE INDEX "serviceable_areas_isActive_city_idx" ON "serviceable_areas"("isActive", "city");

-- CreateIndex
CREATE UNIQUE INDEX "serviceable_areas_city_locality_key" ON "serviceable_areas"("city", "locality");

-- CreateIndex
CREATE UNIQUE INDEX "kitchens_slug_key" ON "kitchens"("slug");

-- CreateIndex
CREATE INDEX "kitchens_status_city_idx" ON "kitchens"("status", "city");

-- CreateIndex
CREATE INDEX "kitchens_isVerified_idx" ON "kitchens"("isVerified");

-- CreateIndex
CREATE INDEX "kitchen_media_kitchenId_sortOrder_idx" ON "kitchen_media"("kitchenId", "sortOrder");

-- CreateIndex
CREATE INDEX "kitchen_follows_kitchenId_idx" ON "kitchen_follows"("kitchenId");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_follows_userId_kitchenId_key" ON "kitchen_follows"("userId", "kitchenId");

-- CreateIndex
CREATE UNIQUE INDEX "meal_categories_slug_key" ON "meal_categories"("slug");

-- CreateIndex
CREATE INDEX "meals_isAvailable_kitchenId_idx" ON "meals"("isAvailable", "kitchenId");

-- CreateIndex
CREATE INDEX "meals_categoryId_idx" ON "meals"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "meals_kitchenId_slug_key" ON "meals"("kitchenId", "slug");

-- CreateIndex
CREATE INDEX "meal_customization_groups_mealId_idx" ON "meal_customization_groups"("mealId");

-- CreateIndex
CREATE INDEX "meal_customization_options_groupId_idx" ON "meal_customization_options"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_mealId_key" ON "favorites"("userId", "mealId");

-- CreateIndex
CREATE INDEX "addresses_userId_isDefault_idx" ON "addresses"("userId", "isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- CreateIndex
CREATE INDEX "cart_items_cartId_idx" ON "cart_items"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");

-- CreateIndex
CREATE INDEX "coupons_isActive_validTill_idx" ON "coupons"("isActive", "validTill");

-- CreateIndex
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");

-- CreateIndex
CREATE INDEX "orders_userId_createdAt_idx" ON "orders"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "orders_kitchenId_status_idx" ON "orders"("kitchenId", "status");

-- CreateIndex
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");

-- CreateIndex
CREATE INDEX "order_status_events_orderId_createdAt_idx" ON "order_status_events"("orderId", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_kitchenId_createdAt_idx" ON "reviews"("kitchenId", "createdAt");

-- CreateIndex
CREATE INDEX "reviews_mealId_createdAt_idx" ON "reviews"("mealId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_orderId_userId_key" ON "reviews"("orderId", "userId");

-- CreateIndex
CREATE INDEX "reels_status_publishedAt_idx" ON "reels"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "reels_kitchenId_idx" ON "reels"("kitchenId");

-- CreateIndex
CREATE INDEX "reel_likes_userId_idx" ON "reel_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reel_likes_reelId_userId_key" ON "reel_likes"("reelId", "userId");

-- CreateIndex
CREATE INDEX "reel_saves_userId_idx" ON "reel_saves"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "reel_saves_reelId_userId_key" ON "reel_saves"("reelId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- CreateIndex
CREATE INDEX "faq_items_isActive_category_sortOrder_idx" ON "faq_items"("isActive", "category", "sortOrder");

-- AddForeignKey
ALTER TABLE "kitchens" ADD CONSTRAINT "kitchens_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_media" ADD CONSTRAINT "kitchen_media_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_follows" ADD CONSTRAINT "kitchen_follows_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_follows" ADD CONSTRAINT "kitchen_follows_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meals" ADD CONSTRAINT "meals_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "meal_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_customization_groups" ADD CONSTRAINT "meal_customization_groups_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_customization_options" ADD CONSTRAINT "meal_customization_options_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "meal_customization_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_deliveryPartnerId_fkey" FOREIGN KEY ("deliveryPartnerId") REFERENCES "delivery_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_kitchenId_fkey" FOREIGN KEY ("kitchenId") REFERENCES "kitchens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reels" ADD CONSTRAINT "reels_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "meals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_likes" ADD CONSTRAINT "reel_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_saves" ADD CONSTRAINT "reel_saves_reelId_fkey" FOREIGN KEY ("reelId") REFERENCES "reels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reel_saves" ADD CONSTRAINT "reel_saves_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

