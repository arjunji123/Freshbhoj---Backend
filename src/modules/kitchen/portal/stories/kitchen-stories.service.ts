import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { PublishStoryDto, UpdateStoryCaptionDto } from './dto/kitchen-stories.dto';

const STORY_LIFETIME_HOURS = 24;

/**
 * Story publishing for the partner app.
 *
 * `KitchenStory.city` is written from the kitchen's own city at publish time
 * so the customer-facing city feed (`Discovery · Stories`) stays a single
 * indexed read — see that module's note for why.
 */
@Injectable()
export class KitchenStoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(accountId: string) {
    const kitchen = await this.requireKitchen(accountId);
    const stories = await this.prisma.kitchenStory.findMany({
      where: { kitchenId: kitchen.id },
      orderBy: { createdAt: 'desc' },
      include: { meal: { select: { name: true } } },
    });

    // Live count, not denormalised — this is a low-traffic admin read, and it
    // stays exactly right even if a story is edited/expires after the order.
    const orderCounts = await this.prisma.order.groupBy({
      by: ['sourceStoryId'],
      where: { sourceStoryId: { in: stories.map((s) => s.id) } },
      _count: { _all: true },
    });
    const orderCountByStory = new Map(orderCounts.map((row) => [row.sourceStoryId, row._count._all]));

    return stories.map((story) => this.toDto(story, orderCountByStory.get(story.id) ?? 0));
  }

  async publish(accountId: string, dto: PublishStoryDto) {
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

    const story = await this.prisma.kitchenStory.create({
      data: {
        kitchenId: kitchen.id,
        mediaType: dto.mediaType,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
        caption: dto.caption,
        mealId: dto.mealId,
        durationSec: dto.durationSec ?? 15,
        city: kitchen.city,
        expiresAt: new Date(Date.now() + STORY_LIFETIME_HOURS * 60 * 60 * 1000),
      },
      include: { meal: { select: { name: true } } },
    });

    return this.toDto(story);
  }

  /** Pull a story down early — the dish sold out, or it was posted by mistake. */
  async deactivate(accountId: string, storyId: string) {
    const kitchen = await this.requireKitchen(accountId);
    await this.assertOwned(kitchen.id, storyId);

    await this.prisma.kitchenStory.update({ where: { id: storyId }, data: { isActive: false } });
    return { id: storyId };
  }

  /** Typo in the caption, or the special changed — no need to repost from scratch. */
  async updateCaption(accountId: string, storyId: string, dto: UpdateStoryCaptionDto) {
    const kitchen = await this.requireKitchen(accountId);
    await this.assertOwned(kitchen.id, storyId);

    const story = await this.prisma.kitchenStory.update({
      where: { id: storyId },
      data: { caption: dto.caption },
      include: { meal: { select: { name: true } } },
    });

    const orderCount = await this.prisma.order.count({ where: { sourceStoryId: storyId } });
    return this.toDto(story, orderCount);
  }

  private async assertOwned(kitchenId: string, storyId: string) {
    const story = await this.prisma.kitchenStory.findUnique({
      where: { id: storyId },
      select: { kitchenId: true },
    });
    if (!story) throw new NotFoundException('Story not found');
    if (story.kitchenId !== kitchenId) {
      throw new ForbiddenException('This story does not belong to your kitchen');
    }
    return story;
  }

  private async requireKitchen(accountId: string) {
    const kitchen = await this.prisma.kitchen.findUnique({
      where: { accountId },
      select: { id: true, city: true },
    });
    if (!kitchen) throw new BadRequestException('Complete onboarding to create your kitchen first');
    return kitchen;
  }

  private toDto(
    story: {
      id: string;
      mediaType: any;
      mediaUrl: string;
      thumbnailUrl: string | null;
      caption: string | null;
      durationSec: number;
      viewCount: number;
      likeCount: number;
      shareCount: number;
      isActive: boolean;
      createdAt: Date;
      expiresAt: Date;
      meal?: { name: string } | null;
    },
    orderCount = 0,
  ) {
    return {
      id: story.id,
      mediaType: story.mediaType,
      mediaUrl: story.mediaUrl,
      thumbnailUrl: story.thumbnailUrl,
      caption: story.caption,
      durationSec: story.durationSec,
      viewCount: story.viewCount,
      likeCount: story.likeCount,
      shareCount: story.shareCount,
      orderCount,
      mealName: story.meal?.name ?? null,
      isActive: story.isActive,
      createdAt: story.createdAt,
      expiresAt: story.expiresAt,
    };
  }
}
