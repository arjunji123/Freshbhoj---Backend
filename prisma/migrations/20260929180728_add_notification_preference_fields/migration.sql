-- AlterTable
ALTER TABLE "notification_preferences" ADD COLUMN     "dailyAiRecommendations" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "subscriptionReminders" BOOLEAN NOT NULL DEFAULT true;
