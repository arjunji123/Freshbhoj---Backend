import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { isKitchenOpenNow } from '../../../common/utils/kitchen';

/**
 * Kitchen Stories — the horizontal rail at the top of Home.
 *
 * Scoped to the viewer's **city**: a customer in Jaipur sees Jaipur kitchens.
 * `KitchenStory.city` is denormalised from the kitchen precisely so this feed
 * is a single indexed read rather than a join plus filter on every Home load.
 *
 * Stories expire 24 hours after publishing, like every other stories product —
 * which is what makes "fresh made today" mean something.
 */
@Injectable()
export class StoriesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Grouped by kitchen, because the rail shows one avatar per kitchen that then
   * opens into that kitchen's stories in sequence.
   */
  async getCityFeed(city: string, userId?: string) {
    const now = new Date();

    const stories = await this.prisma.kitchenStory.findMany({
      where: {
        city: { equals: city, mode: 'insensitive' },
        isActive: true,
        expiresAt: { gt: now },
        kitchen: { status: 'ACTIVE' },
      },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        mediaType: true,
        mediaUrl: true,
        thumbnailUrl: true,
        caption: true,
        durationSec: true,
        viewCount: true,
        createdAt: true,
        expiresAt: true,
        meal: { select: { id: true, name: true, price: true, images: true, foodType: true } },
        kitchen: {
          select: {
            id: true,
            slug: true,
            name: true,
            logoUrl: true,
            isVerified: true,
            locality: true,
            opensAt: true,
            closesAt: true,
            isAcceptingOrders: true,
          },
        },
      },
    });

    const seen = await this.getSeenStoryIds(userId, stories.map((s) => s.id));

    // Group into one entry per kitchen, preserving publish order within each.
    const byKitchen = new Map<string, any>();
    for (const story of stories) {
      const key = story.kitchen.id;
      if (!byKitchen.has(key)) {
        byKitchen.set(key, {
          kitchen: {
            id: story.kitchen.id,
            slug: story.kitchen.slug,
            name: story.kitchen.name,
            logoUrl: story.kitchen.logoUrl,
            isVerified: story.kitchen.isVerified,
            locality: story.kitchen.locality,
            isOpenNow:
              story.kitchen.isAcceptingOrders &&
              isKitchenOpenNow(story.kitchen.opensAt, story.kitchen.closesAt),
          },
          items: [],
        });
      }

      byKitchen.get(key).items.push({
        id: story.id,
        mediaType: story.mediaType,
        mediaUrl: story.mediaUrl,
        thumbnailUrl: story.thumbnailUrl,
        caption: story.caption,
        durationSec: story.durationSec,
        viewCount: story.viewCount,
        publishedAt: story.createdAt,
        expiresAt: story.expiresAt,
        isSeen: seen.has(story.id),
        meal: story.meal
          ? {
              id: story.meal.id,
              name: story.meal.name,
              price: story.meal.price,
              image: story.meal.images[0] ?? null,
              foodType: story.meal.foodType,
            }
          : null,
      });
    }

    const groups = [...byKitchen.values()].map((group) => ({
      ...group,
      storyCount: group.items.length,
      // The ring is filled only while something is still unwatched.
      hasUnseen: group.items.some((item: any) => !item.isSeen),
      coverImage: group.items[0]?.thumbnailUrl ?? group.items[0]?.mediaUrl ?? null,
    }));

    // Kitchens with something new to show float to the front of the rail.
    groups.sort((a, b) => Number(b.hasUnseen) - Number(a.hasUnseen));
    return groups;
  }

  async getForKitchen(kitchenId: string, userId?: string) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { id: kitchenId },
      select: { id: true, city: true },
    });
    if (!kitchen) throw new NotFoundException('Kitchen not found');

    const groups = await this.getCityFeed(kitchen.city, userId);
    return groups.find((g) => g.kitchen.id === kitchenId) ?? { kitchen: null, items: [] };
  }

  /** Marks a story seen for this viewer and bumps its view counter once. */
  async markSeen(storyId: string, userId?: string) {
    const story = await this.prisma.kitchenStory.findUnique({
      where: { id: storyId },
      select: { id: true },
    });
    if (!story) throw new NotFoundException('Story not found');

    if (!userId) {
      await this.prisma.kitchenStory.update({
        where: { id: storyId },
        data: { viewCount: { increment: 1 } },
      });
      return { storyId, isSeen: false, recorded: true };
    }

    const existing = await this.prisma.kitchenStoryView.findUnique({
      where: { storyId_userId: { storyId, userId } },
      select: { id: true },
    });

    // Only the first view from a given customer counts, so the number means
    // "people reached" rather than "times scrubbed".
    if (!existing) {
      await this.prisma.$transaction([
        this.prisma.kitchenStoryView.create({ data: { storyId, userId } }),
        this.prisma.kitchenStory.update({
          where: { id: storyId },
          data: { viewCount: { increment: 1 } },
        }),
      ]);
    }

    return { storyId, isSeen: true, recorded: !existing };
  }

  private async getSeenStoryIds(userId: string | undefined, storyIds: string[]) {
    if (!userId || !storyIds.length) return new Set<string>();
    const views = await this.prisma.kitchenStoryView.findMany({
      where: { userId, storyId: { in: storyIds } },
      select: { storyId: true },
    });
    return new Set(views.map((v) => v.storyId));
  }

  /** Used by the partner portal when a kitchen publishes. */
  buildExpiry(hours = 24): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  static readonly WHERE_LIVE: Prisma.KitchenStoryWhereInput = {
    isActive: true,
    expiresAt: { gt: new Date() },
  };
}
