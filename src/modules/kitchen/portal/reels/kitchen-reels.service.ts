import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ReelStatus } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PublishReelDto, UpdateReelDto } from './dto/kitchen-reels.dto';

/**
 * Reel publishing for the partner app.
 *
 * Unlike a story, a published reel stays up until the kitchen archives it —
 * `getFeed`/`findOne` on the customer-facing `ReelsService` already filter to
 * `status: PUBLISHED`, so archiving here is enough to pull it out of the feed
 * without touching the discovery module.
 */
@Injectable()
export class KitchenReelsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const reels = await this.prisma.reel.findMany({
      where: { kitchenId: kitchen.id },
      orderBy: { createdAt: 'desc' },
      include: { meal: { select: { name: true } } },
    });

    // Live count, not denormalised — same mechanism as
    // `KitchenStoriesService.list()`, keyed on sourceReelId instead.
    const orderCounts = await this.prisma.order.groupBy({
      by: ['sourceReelId'],
      where: { sourceReelId: { in: reels.map((r) => r.id) } },
      _count: { _all: true },
    });
    const orderCountByReel = new Map(orderCounts.map((row) => [row.sourceReelId, row._count._all]));

    return reels.map((reel) => this.toDto(reel, orderCountByReel.get(reel.id) ?? 0));
  }

  async publish(accountId: string, dto: PublishReelDto) {
    const kitchen = await this.requireKitchen(accountId);

    if (dto.mealId) {
      const meal = await this.prisma.meal.findUnique({
        where: { id: dto.mealId },
        select: { kitchenId: true },
      });
      if (!meal || meal.kitchenId !== kitchen.id) {
        throw new BadRequestException('That dish does not belong to your kitchen');
      }
    }

    const reel = await this.prisma.reel.create({
      data: {
        kitchenId: kitchen.id,
        mealId: dto.mealId,
        videoUrl: dto.videoUrl,
        thumbnailUrl: dto.thumbnailUrl,
        caption: dto.caption,
        hashtags: dto.hashtags ?? [],
        durationSec: dto.durationSec ?? 0,
        status: ReelStatus.PUBLISHED,
      },
      include: { meal: { select: { name: true } } },
    });

    return this.toDto(reel);
  }

  /** Typo in the caption, or the hashtags changed — no need to repost from scratch. */
  async update(accountId: string, reelId: string, dto: UpdateReelDto) {
    const kitchen = await this.requireKitchen(accountId);
    await this.assertOwned(kitchen.id, reelId);

    const reel = await this.prisma.reel.update({
      where: { id: reelId },
      data: {
        ...(dto.caption !== undefined ? { caption: dto.caption } : {}),
        ...(dto.hashtags !== undefined ? { hashtags: dto.hashtags } : {}),
      },
      include: { meal: { select: { name: true } } },
    });

    const orderCount = await this.prisma.order.count({ where: { sourceReelId: reelId } });
    return this.toDto(reel, orderCount);
  }

  /** Pull a reel down — the dish sold out, or it was posted by mistake. */
  async archive(accountId: string, reelId: string) {
    const kitchen = await this.requireKitchen(accountId);
    await this.assertOwned(kitchen.id, reelId);

    await this.prisma.reel.update({ where: { id: reelId }, data: { status: ReelStatus.ARCHIVED } });
    return { id: reelId };
  }

  /**
   * Temporarily hide a reel from the public feed without archiving it —
   * resumable, unlike `archive`. `ReelsService.getFeed`/`findOne` (discovery
   * module) filter on `isPaused: false` alongside `status: PUBLISHED`.
   */
  async pause(accountId: string, reelId: string) {
    const kitchen = await this.requireKitchen(accountId);
    await this.assertOwned(kitchen.id, reelId);

    await this.prisma.reel.update({ where: { id: reelId }, data: { isPaused: true } });
    return { id: reelId, isPaused: true };
  }

  async resume(accountId: string, reelId: string) {
    const kitchen = await this.requireKitchen(accountId);
    await this.assertOwned(kitchen.id, reelId);

    await this.prisma.reel.update({ where: { id: reelId }, data: { isPaused: false } });
    return { id: reelId, isPaused: false };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // OPS-FACING (V0 admin tool)
  // ──────────────────────────────────────────────────────────────────────────

  /** No self-serve boost flow or spend tracking — ops flips this by hand. */
  async adminSetSponsored(reelId: string, isSponsored: boolean) {
    const exists = await this.prisma.reel.findUnique({ where: { id: reelId }, select: { id: true } });
    if (!exists) throw new NotFoundException('Reel not found');

    const reel = await this.prisma.reel.update({
      where: { id: reelId },
      data: { isSponsored },
      include: { meal: { select: { name: true } } },
    });
    const orderCount = await this.prisma.order.count({ where: { sourceReelId: reelId } });
    return this.toDto(reel, orderCount);
  }

  private async assertOwned(kitchenId: string, reelId: string) {
    const reel = await this.prisma.reel.findUnique({ where: { id: reelId }, select: { kitchenId: true } });
    if (!reel) throw new NotFoundException('Reel not found');
    if (reel.kitchenId !== kitchenId) {
      throw new ForbiddenException('This reel does not belong to your kitchen');
    }
    return reel;
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({ where: { accountId }, select: { id: true } });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }

  private toDto(
    reel: {
      id: string;
      videoUrl: string;
      thumbnailUrl: string | null;
      caption: string | null;
      hashtags: string[];
      durationSec: number;
      status: ReelStatus;
      isPaused: boolean;
      isSponsored: boolean;
      viewCount: number;
      likeCount: number;
      shareCount: number;
      commentCount: number;
      publishedAt: Date;
      createdAt: Date;
      meal?: { name: string } | null;
    },
    orderCount = 0,
  ) {
    return {
      id: reel.id,
      videoUrl: reel.videoUrl,
      thumbnailUrl: reel.thumbnailUrl,
      caption: reel.caption,
      hashtags: reel.hashtags,
      durationSec: reel.durationSec,
      status: reel.status,
      isPaused: reel.isPaused,
      isSponsored: reel.isSponsored,
      viewCount: reel.viewCount,
      likeCount: reel.likeCount,
      shareCount: reel.shareCount,
      commentCount: reel.commentCount,
      orderCount,
      mealName: reel.meal?.name ?? null,
      publishedAt: reel.publishedAt,
      createdAt: reel.createdAt,
    };
  }
}
