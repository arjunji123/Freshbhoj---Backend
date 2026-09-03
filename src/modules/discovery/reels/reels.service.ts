import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReelStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { Paginated, paginate, toSkip } from '../../../common/dto/pagination.dto';
import { ReelFeedQueryDto, ReelFeedType } from './dto/reels.dto';

const REEL_SELECT = Prisma.validator<Prisma.ReelSelect>()({
  id: true,
  videoUrl: true,
  thumbnailUrl: true,
  caption: true,
  hashtags: true,
  durationSec: true,
  viewCount: true,
  likeCount: true,
  shareCount: true,
  commentCount: true,
  publishedAt: true,
  kitchen: {
    select: {
      id: true,
      slug: true,
      name: true,
      logoUrl: true,
      isVerified: true,
      rating: true,
      locality: true,
    },
  },
  meal: {
    select: {
      id: true,
      name: true,
      price: true,
      mrp: true,
      images: true,
      foodType: true,
      calories: true,
      proteinG: true,
      isAvailable: true,
    },
  },
});

type ReelRow = Prisma.ReelGetPayload<{ select: typeof REEL_SELECT }>;

@Injectable()
export class ReelsService {
  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────────────────────────────────
  // FEED
  // ──────────────────────────────────────────────────────────────────────────

  async getFeed(query: ReelFeedQueryDto, userId?: string): Promise<Paginated<any>> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.ReelWhereInput = {
      status: ReelStatus.PUBLISHED,
      kitchen: { status: 'ACTIVE' },
      ...(query.kitchenId && { kitchenId: query.kitchenId }),
      ...(query.q && {
        OR: [
          { caption: { contains: query.q, mode: 'insensitive' } },
          { hashtags: { has: query.q.replace(/^#/, '') } },
          { kitchen: { name: { contains: query.q, mode: 'insensitive' } } },
        ],
      }),
    };

    if (query.feed === ReelFeedType.FOLLOWING) {
      if (!userId) {
        // Signed-out users have nobody to follow — an empty feed, not an error.
        return paginate([], page, limit, 0);
      }
      where.kitchen = { ...(where.kitchen as object), followers: { some: { userId } } };
    }

    if (query.feed === ReelFeedType.TRENDING) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      where.publishedAt = { gte: sevenDaysAgo };
    }

    const [rows, total] = await Promise.all([
      this.prisma.reel.findMany({
        where,
        select: REEL_SELECT,
        orderBy: this.buildOrderBy(query.feed),
        skip: toSkip(page, limit),
        take: limit,
      }),
      this.prisma.reel.count({ where }),
    ]);

    const engagement = await this.getEngagement(userId, rows.map((r) => r.id));

    return paginate(rows.map((r) => this.toReel(r, engagement)), page, limit, total);
  }

  async findOne(reelId: string, userId?: string) {
    const reel = await this.prisma.reel.findFirst({
      // Same visibility rule as the feed — a reel from a kitchen that isn't
      // ACTIVE must not be reachable by id.
      where: { id: reelId, kitchen: { status: 'ACTIVE' } },
      select: REEL_SELECT,
    });
    if (!reel) throw new NotFoundException('Reel not found');

    const engagement = await this.getEngagement(userId, [reel.id]);
    return this.toReel(reel, engagement);
  }

  async findForKitchen(kitchenId: string, page = 1, limit = 12, userId?: string): Promise<Paginated<any>> {
    return this.getFeed({ kitchenId, page, limit, feed: ReelFeedType.FOR_YOU }, userId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ENGAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  async toggleLike(userId: string, reelId: string) {
    await this.assertExists(reelId);

    const existing = await this.prisma.reelLike.findUnique({
      where: { reelId_userId: { reelId, userId } },
    });

    if (existing) {
      const [, reel] = await this.prisma.$transaction([
        this.prisma.reelLike.delete({ where: { id: existing.id } }),
        this.prisma.reel.update({
          where: { id: reelId },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        }),
      ]);
      return { reelId, isLiked: false, likeCount: reel.likeCount };
    }

    const [, reel] = await this.prisma.$transaction([
      this.prisma.reelLike.create({ data: { reelId, userId } }),
      this.prisma.reel.update({
        where: { id: reelId },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      }),
    ]);
    return { reelId, isLiked: true, likeCount: reel.likeCount };
  }

  async toggleSave(userId: string, reelId: string) {
    await this.assertExists(reelId);

    const existing = await this.prisma.reelSave.findUnique({
      where: { reelId_userId: { reelId, userId } },
    });

    if (existing) {
      await this.prisma.reelSave.delete({ where: { id: existing.id } });
      return { reelId, isSaved: false };
    }

    await this.prisma.reelSave.create({ data: { reelId, userId } });
    return { reelId, isSaved: true };
  }

  /** Fire-and-forget from the player once a reel has been watched. */
  async recordView(reelId: string) {
    await this.prisma.reel.updateMany({
      where: { id: reelId },
      data: { viewCount: { increment: 1 } },
    });
    return { reelId, recorded: true };
  }

  async recordShare(reelId: string) {
    await this.prisma.reel.updateMany({
      where: { id: reelId },
      data: { shareCount: { increment: 1 } },
    });
    return { reelId, recorded: true };
  }

  async listSaved(userId: string, page = 1, limit = 20): Promise<Paginated<any>> {
    const where: Prisma.ReelSaveWhereInput = { userId };

    const [saves, total] = await Promise.all([
      this.prisma.reelSave.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: toSkip(page, limit),
        take: limit,
        select: { reel: { select: REEL_SELECT } },
      }),
      this.prisma.reelSave.count({ where }),
    ]);

    const engagement = await this.getEngagement(userId, saves.map((s) => s.reel.id));
    return paginate(saves.map((s) => this.toReel(s.reel, engagement)), page, limit, total);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // INTERNAL
  // ──────────────────────────────────────────────────────────────────────────

  /** One round-trip for the page's likes/saves instead of two per reel. */
  private async getEngagement(userId: string | undefined, reelIds: string[]) {
    if (!userId || !reelIds.length) {
      return { liked: new Set<string>(), saved: new Set<string>() };
    }

    const [likes, saves] = await Promise.all([
      this.prisma.reelLike.findMany({
        where: { userId, reelId: { in: reelIds } },
        select: { reelId: true },
      }),
      this.prisma.reelSave.findMany({
        where: { userId, reelId: { in: reelIds } },
        select: { reelId: true },
      }),
    ]);

    return {
      liked: new Set(likes.map((l) => l.reelId)),
      saved: new Set(saves.map((s) => s.reelId)),
    };
  }

  private toReel(reel: ReelRow, engagement: { liked: Set<string>; saved: Set<string> }) {
    return {
      id: reel.id,
      videoUrl: reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl,
      caption: reel.caption,
      hashtags: reel.hashtags,
      durationSec: reel.durationSec,
      publishedAt: reel.publishedAt,
      stats: {
        views: reel.viewCount,
        likes: reel.likeCount,
        shares: reel.shareCount,
        comments: reel.commentCount,
        viewsLabel: this.compactCount(reel.viewCount),
        likesLabel: this.compactCount(reel.likeCount),
      },
      isLiked: engagement.liked.has(reel.id),
      isSaved: engagement.saved.has(reel.id),
      kitchen: reel.kitchen,
      /** Present when the reel is shoppable — renders the in-feed Add to cart CTA. */
      meal: reel.meal
        ? {
            id: reel.meal.id,
            name: reel.meal.name,
            price: reel.meal.price,
            mrp: reel.meal.mrp,
            image: reel.meal.images[0] ?? null,
            foodType: reel.meal.foodType,
            calories: reel.meal.calories,
            proteinG: reel.meal.proteinG,
            isAvailable: reel.meal.isAvailable,
          }
        : null,
    };
  }

  private buildOrderBy(feed?: ReelFeedType): Prisma.ReelOrderByWithRelationInput[] {
    switch (feed) {
      case ReelFeedType.TRENDING:
        return [{ likeCount: 'desc' }, { viewCount: 'desc' }];
      case ReelFeedType.FOLLOWING:
        return [{ publishedAt: 'desc' }];
      case ReelFeedType.FOR_YOU:
      default:
        // Recent-but-popular: newest first, engagement breaks ties.
        return [{ publishedAt: 'desc' }, { likeCount: 'desc' }];
    }
  }

  /** 12400 → "12.4K", matching the overlay pills in the design. */
  private compactCount(value: number): string {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(value);
  }

  private async assertExists(reelId: string) {
    const exists = await this.prisma.reel.findUnique({ where: { id: reelId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Reel not found');
  }
}
