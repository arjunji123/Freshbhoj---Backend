-- AlterTable
ALTER TABLE "carts" ADD COLUMN     "sourceStoryId" TEXT;

-- AlterTable
ALTER TABLE "kitchen_stories" ADD COLUMN     "likeCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shareCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "sourceStoryId" TEXT;

-- CreateTable
CREATE TABLE "kitchen_story_likes" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_story_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kitchen_story_likes_userId_idx" ON "kitchen_story_likes"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_story_likes_storyId_userId_key" ON "kitchen_story_likes"("storyId", "userId");

-- AddForeignKey
ALTER TABLE "kitchen_story_likes" ADD CONSTRAINT "kitchen_story_likes_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "kitchen_stories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_story_likes" ADD CONSTRAINT "kitchen_story_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

